import { app, BrowserWindow, desktopCapturer, ipcMain, screen, session, shell } from "electron";
import { is } from "@electron-toolkit/utils";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { pickCaptureSourceByDisplayId } from "../shared/captureSource";
import { assertExportRecordingRequest } from "../shared/exportRequest";
import { createOutputFilePath } from "../shared/outputPaths";
import { isPathInsideDirectory } from "../shared/pathSafety";
import type { AppInfo, CaptureSourceInfo, DisplayInfo, ExportRecordingRequest, ExportRecordingResult } from "../shared/types";
import { CaptureSession } from "./captureSession";
import { toDisplayInfo } from "./display";
import { getFfmpegInfo, transcodeRecording } from "./ffmpeg";
import { getScreenPermissionInfo, openScreenRecordingSettings } from "./permissions";
import { loadRenderer } from "./rendererLoader";
import { registerSelectionIpc, selectRegion } from "./selection";

let mainWindow: BrowserWindow | null = null;
const captureSession = new CaptureSession();

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
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  void loadRenderer(mainWindow, { mode: "app" }, is.dev);

  if (is.dev && process.env.SCREEN_REGION_RECORDER_DEVTOOLS === "1") {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }
}

function registerDisplayMediaHandler(): void {
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    const activeCaptureDisplayId = captureSession.getActiveDisplayId();
    if (activeCaptureDisplayId === null) {
      callback({});
      return;
    }

    try {
      const source = await getSourceForDisplay(activeCaptureDisplayId);
      callback(source ? { video: source } : {});
    } catch {
      captureSession.finish();
      callback({});
    }
  }, { useSystemPicker: false });
}

function registerIpcHandlers(): void {
  registerSelectionIpc();

  ipcMain.handle("screenclip:get-app-info", async (): Promise<AppInfo> => {
    return getAppInfo();
  });

  ipcMain.handle("screenclip:check-permission", () => {
    return getScreenPermissionInfo();
  });

  ipcMain.handle("screenclip:open-screen-settings", async () => {
    await openScreenRecordingSettings();
  });

  ipcMain.handle("screenclip:select-region", async () => {
    return selectRegion();
  });

  ipcMain.handle("screenclip:prepare-capture", async (_event, displayId: unknown): Promise<CaptureSourceInfo> => {
    if (typeof displayId !== "number" || !Number.isInteger(displayId)) {
      throw new Error("显示器 ID 无效。");
    }

    const source = await getSourceForDisplay(displayId);
    const display = getDisplayInfo(displayId);

    if (!source) {
      captureSession.finish();
      throw new Error("未找到可录制的屏幕源。请确认屏幕录制权限已开启后重试。");
    }

    if (!display) {
      captureSession.finish();
      throw new Error("未找到选中区域对应的显示器。");
    }

    // Only arm the display-media route after the source is confirmed.
    captureSession.prepare(displayId);

    return {
      sourceId: source.id,
      sourceName: source.name,
      display
    };
  });

  ipcMain.handle("screenclip:finish-capture", async () => {
    captureSession.finish();
  });

  ipcMain.handle("screenclip:export-recording", async (_event, request: unknown): Promise<ExportRecordingResult> => {
    return exportRecording(assertExportRecordingRequest(request));
  });

  ipcMain.on("screenclip:hide-main-window", () => {
    mainWindow?.hide();
  });

  ipcMain.on("screenclip:show-main-window", () => {
    mainWindow?.show();
  });

  ipcMain.handle("screenclip:open-output-dir", async () => {
    const outputDir = getOutputDir();
    mkdirSync(outputDir, { recursive: true });
    await shell.openPath(outputDir);
  });

  ipcMain.handle("screenclip:reveal-file", async (_event, filePath: string) => {
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
    captureSession.finish();
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

function getDisplayInfo(displayId: number): DisplayInfo | null {
  const display = screen.getAllDisplays().find((item) => item.id === displayId);
  return display ? toDisplayInfo(display) : null;
}

function getOutputDir(): string {
  return join(app.getPath("downloads"), "ScreenClips");
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
