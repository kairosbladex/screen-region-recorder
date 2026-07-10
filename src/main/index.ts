import { app, BrowserWindow, desktopCapturer, ipcMain, screen, session, shell } from "electron";
import { is } from "@electron-toolkit/utils";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { pickCaptureSourceByDisplayId } from "../shared/captureSource";
import { createOutputFilePath } from "../shared/outputPaths";
import { isPathInsideDirectory } from "../shared/pathSafety";
import type { AppInfo, CapturePreparation, ExportRecordingRequest, ExportRecordingResult } from "../shared/types";
import { CaptureCoordinator, type CaptureOwner } from "./captureCoordinator";
import { CaptureRequestController } from "./captureRequestController";
import { createDisplayMediaRequestHandler } from "./displayMediaHandler";
import { getFfmpegInfo, transcodeRecording } from "./ffmpeg";
import { getScreenPermissionInfo, openScreenRecordingSettings } from "./permissions";
import { getRendererEntryUrl, loadRenderer } from "./rendererLoader";
import { cancelActiveSelection, registerSelectionIpc, selectRegion } from "./selection";
import { createSecureWebPreferences, hardenWindowNavigation } from "./windowSecurity";
import { assertWindowSender } from "./ipcSecurity";

let mainWindow: BrowserWindow | null = null;
const captureCoordinator = new CaptureCoordinator();
const captureRequests = new CaptureRequestController({ coordinator: captureCoordinator, exportRecording });

app.commandLine.appendSwitch("disable-features", "MacCatapLoopbackAudioForScreenShare");

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 820,
    height: 560,
    minWidth: 720,
    minHeight: 500,
    title: "Screen Region Recorder",
    backgroundColor: "#f7f8fb",
    show: true,
    webPreferences: createSecureWebPreferences(join(__dirname, "../preload/app.js"))
  });

  const rendererQuery = { mode: "app" };
  hardenWindowNavigation(mainWindow, getRendererEntryUrl(rendererQuery, is.dev));
  void loadRenderer(mainWindow, rendererQuery, is.dev);

  const ownerWebContentsId = mainWindow.webContents.id;
  mainWindow.webContents.on("render-process-gone", () => {
    captureCoordinator.finishOwner(ownerWebContentsId);
    cancelActiveSelection();
  });
  mainWindow.once("closed", () => {
    captureCoordinator.finishOwner(ownerWebContentsId);
    cancelActiveSelection();
    mainWindow = null;
  });

  if (is.dev && process.env.SCREEN_REGION_RECORDER_DEVTOOLS === "1") {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

function registerDisplayMediaHandler(): void {
  session.defaultSession.setDisplayMediaRequestHandler(
    createDisplayMediaRequestHandler({ coordinator: captureCoordinator, getSourceForDisplay }),
    { useSystemPicker: false }
  );
}

function registerIpcHandlers(): void {
  registerSelectionIpc();

  ipcMain.handle("screenclip:get-app-info", async (event): Promise<AppInfo> => {
    assertMainWindowSender(event);
    return getAppInfo();
  });

  ipcMain.handle("screenclip:open-screen-settings", async (event) => {
    assertMainWindowSender(event);
    await openScreenRecordingSettings();
  });

  ipcMain.handle("screenclip:select-region", async (event) => {
    const { window } = assertMainWindowSender(event);
    window.hide();
    try {
      return await selectRegion();
    } finally {
      if (!window.isDestroyed()) {
        window.show();
      }
    }
  });

  ipcMain.handle("screenclip:prepare-capture", async (event, displayId: unknown): Promise<CapturePreparation> => {
    const { owner, window } = assertMainWindowSender(event);
    if (typeof displayId !== "number" || !Number.isInteger(displayId)) {
      throw new Error("显示器 ID 无效。");
    }

    const permission = getScreenPermissionInfo();
    if (permission.status !== "granted") {
      throw new Error(permission.message);
    }

    const source = await getSourceForDisplay(displayId);

    if (!source) {
      throw new Error("未找到可录制的屏幕源。请确认屏幕录制权限已开启后重试。");
    }

    if (!screen.getAllDisplays().some((item) => item.id === displayId)) {
      throw new Error("未找到选中区域对应的显示器。");
    }

    assertWindowSender(event, window);
    return captureCoordinator.prepare(owner, displayId, {
      hide: () => {
        if (window.isDestroyed()) {
          throw new Error("主窗口已关闭，无法开始录制。");
        }
        window.hide();
      },
      restore: () => {
        if (!window.isDestroyed()) {
          window.show();
        }
      }
    });
  });

  ipcMain.handle("screenclip:finish-capture", async (event, sessionId: unknown) => {
    const { owner } = assertMainWindowSender(event);
    captureRequests.finish(owner, sessionId);
  });

  ipcMain.handle("screenclip:export-recording", async (event, request: unknown): Promise<ExportRecordingResult> => {
    const { owner } = assertMainWindowSender(event);
    return captureRequests.export(owner, request);
  });

  ipcMain.handle("screenclip:open-output-dir", async (event) => {
    assertMainWindowSender(event);
    const outputDir = getOutputDir();
    mkdirSync(outputDir, { recursive: true });
    await shell.openPath(outputDir);
  });

  ipcMain.handle("screenclip:reveal-file", async (event, filePath: string) => {
    assertMainWindowSender(event);
    if (typeof filePath !== "string" || !isPathInsideDirectory(filePath, getOutputDir())) {
      throw new Error("只能打开输出目录内的录制文件。");
    }

    shell.showItemInFolder(filePath);
  });
}

async function getAppInfo(): Promise<AppInfo> {
  const outputDir = getOutputDir();
  mkdirSync(outputDir, { recursive: true });

  return {
    outputDir,
    permission: getScreenPermissionInfo(),
    ffmpeg: await getFfmpegInfo()
  };
}

async function exportRecording(request: ExportRecordingRequest): Promise<ExportRecordingResult> {
  const outputPath = createOutputFilePath(app.getPath("downloads"), new Date(), request.durationSeconds, request.format);
  const outputDir = dirname(outputPath);
  const tempDir = mkdtempSync(join(tmpdir(), "screen-region-recorder-"));
  const inputPath = join(tempDir, "capture.webm");

  try {
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(inputPath, Buffer.from(new Uint8Array(request.data)));
    await transcodeRecording({
      inputPath,
      outputPath,
      format: request.format,
      region: request.region,
      capturedSize: request.capturedSize
    });

    return {
      ok: true,
      filePath: outputPath,
      outputDir
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function getSourceForDisplay(displayId: number): Promise<Electron.DesktopCapturerSource | null> {
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: 0, height: 0 },
    fetchWindowIcons: false
  });
  const displayCount = screen.getAllDisplays().length;

  return pickCaptureSourceByDisplayId(sources, displayId, { displayCount });
}

function getOutputDir(): string {
  return join(app.getPath("downloads"), "ScreenClips");
}

function assertMainWindowSender(event: Electron.IpcMainInvokeEvent): { owner: CaptureOwner; window: BrowserWindow } {
  const window = mainWindow;
  if (!window) {
    throw new Error("IPC 请求来源无效。");
  }

  return {
    window,
    owner: assertWindowSender(event, window)
  };
}

app.whenReady().then(() => {
  registerDisplayMediaHandler();
  registerIpcHandlers();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
