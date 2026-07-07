import { BrowserWindow, ipcMain, screen } from "electron";
import { join } from "node:path";
import { buildCaptureRegion, hasUsableSelection, translateOverlayRectToDisplayLocal } from "../shared/coordinates";
import type { CaptureRegion, SelectionCompletePayload, SelectionResult } from "../shared/types";
import { toDisplayInfo } from "./display";

interface SelectionSession {
  windows: BrowserWindow[];
  resolve: (result: SelectionResult) => void;
  settled: boolean;
}

let activeSession: SelectionSession | null = null;

export function registerSelectionIpc(): void {
  ipcMain.on("screenclip:selection-complete", (event, payload: SelectionCompletePayload) => {
    completeSelection(BrowserWindow.fromWebContents(event.sender), payload);
  });

  ipcMain.on("screenclip:selection-cancel", () => {
    cancelSelection();
  });
}

export async function selectRegion(): Promise<SelectionResult> {
  cancelSelection();

  return new Promise((resolve) => {
    const displays = screen.getAllDisplays();
    const windows = displays.map((display) => {
      const overlay = createOverlayWindow(display);
      void loadRenderer(overlay, { mode: "selection", displayId: String(display.id) });
      return overlay;
    });

    activeSession = { windows, resolve, settled: false };
  });
}

function completeSelection(selectionWindow: BrowserWindow | null, payload: SelectionCompletePayload): void {
  const session = activeSession;
  if (!session || session.settled) {
    return;
  }

  if (!selectionWindow) {
    settleSession({ ok: false, error: "未找到框选窗口，请重新选择。" });
    return;
  }

  const display = screen.getAllDisplays().find((item) => item.id === payload.displayId);
  if (!display) {
    settleSession({ ok: false, error: "未找到框选区域所在的显示器，请重新选择。" });
    return;
  }

  if (!hasUsableSelection(payload.rect)) {
    settleSession({ ok: false, cancelled: true, error: "选择区域太小，已取消。" });
    return;
  }

  const displayInfo = toDisplayInfo(display);
  const localRect = translateOverlayRectToDisplayLocal(displayInfo, selectionWindow.getBounds(), payload.rect);
  const region: CaptureRegion = buildCaptureRegion(displayInfo, localRect);
  settleSession({ ok: true, region });
}

function cancelSelection(): void {
  if (!activeSession || activeSession.settled) {
    activeSession = null;
    return;
  }

  settleSession({ ok: false, cancelled: true, error: "已取消区域选择。" });
}

function settleSession(result: SelectionResult): void {
  const session = activeSession;
  if (!session) {
    return;
  }

  session.settled = true;
  for (const window of session.windows) {
    if (!window.isDestroyed()) {
      window.close();
    }
  }
  session.resolve(result);
  activeSession = null;
}

function createOverlayWindow(display: Electron.Display): BrowserWindow {
  const window = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    transparent: true,
    resizable: false,
    backgroundColor: "#00000000",
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  window.setAlwaysOnTop(true, "screen-saver");
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  window.focus();

  return window;
}

function loadRenderer(window: BrowserWindow, query: Record<string, string>): Promise<void> {
  if (process.env.ELECTRON_RENDERER_URL) {
    const url = new URL(process.env.ELECTRON_RENDERER_URL);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
    return window.loadURL(url.toString());
  }

  return window.loadFile(join(__dirname, "../renderer/index.html"), { query });
}
