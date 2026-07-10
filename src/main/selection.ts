import { BrowserWindow, ipcMain, screen } from "electron";
import { is } from "@electron-toolkit/utils";
import { join } from "node:path";
import { buildCaptureRegion, hasUsableSelection, translateOverlayRectToDisplayLocal } from "../shared/coordinates";
import { assertSelectionRectangle } from "../shared/selectionRequest";
import type { CaptureRegion, Rectangle, SelectionResult } from "../shared/types";
import { toDisplayInfo } from "./display";
import { getRendererEntryUrl, loadRenderer } from "./rendererLoader";
import { createSecureWebPreferences, hardenWindowNavigation } from "./windowSecurity";
import { isWindowSender } from "./ipcSecurity";

interface SelectionWindowEntry {
  window: BrowserWindow;
  displayId: number;
}

interface SelectionSession {
  entries: SelectionWindowEntry[];
  resolve: (result: SelectionResult) => void;
  settled: boolean;
}

let activeSession: SelectionSession | null = null;

export function registerSelectionIpc(): void {
  ipcMain.on("screenclip:selection-complete", (event, payload: unknown) => {
    const selectionWindow = getActiveSelectionWindow(event);
    if (!selectionWindow) {
      return;
    }

    try {
      completeSelection(selectionWindow, assertSelectionRectangle(payload));
    } catch {
      return;
    }
  });

  ipcMain.on("screenclip:selection-cancel", (event) => {
    if (getActiveSelectionWindow(event)) {
      cancelActiveSelection();
    }
  });
}

export async function selectRegion(): Promise<SelectionResult> {
  cancelActiveSelection();

  return new Promise((resolve) => {
    const displays = screen.getAllDisplays();
    if (displays.length === 0) {
      resolve({ ok: false, error: "未找到可用显示器，请重新尝试。" });
      return;
    }

    const entries = displays.map((display) => {
      const overlay = createOverlayWindow(display);
      const rendererQuery = { mode: "selection" };
      hardenWindowNavigation(overlay, getRendererEntryUrl(rendererQuery, is.dev));
      void loadRenderer(overlay, rendererQuery, is.dev);
      return { window: overlay, displayId: display.id };
    });

    activeSession = { entries, resolve, settled: false };
    for (const entry of entries) {
      entry.window.once("closed", handleSelectionWindowClosed);
    }
  });
}

function completeSelection(selectionWindow: BrowserWindow, rect: Rectangle): void {
  const session = activeSession;
  if (!session || session.settled) {
    return;
  }

  const entry = session.entries.find((item) => item.window === selectionWindow);
  const display = entry ? screen.getAllDisplays().find((item) => item.id === entry.displayId) : null;
  if (!display) {
    settleSession({ ok: false, error: "未找到框选区域所在的显示器，请重新选择。" });
    return;
  }

  if (!hasUsableSelection(rect)) {
    settleSession({ ok: false, cancelled: true, error: "选择区域太小，已取消。" });
    return;
  }

  const displayInfo = toDisplayInfo(display);
  const localRect = translateOverlayRectToDisplayLocal(displayInfo, selectionWindow.getBounds(), rect);
  const region: CaptureRegion = buildCaptureRegion(displayInfo, localRect);
  settleSession({ ok: true, region });
}

export function cancelActiveSelection(): void {
  if (!activeSession || activeSession.settled) {
    activeSession = null;
    return;
  }

  settleSession({ ok: false, cancelled: true, error: "已取消区域选择。" });
}

function handleSelectionWindowClosed(): void {
  const session = activeSession;
  if (!session || session.settled) {
    return;
  }

  if (session.entries.every((entry) => entry.window.isDestroyed())) {
    settleSession({ ok: false, cancelled: true, error: "区域选择窗口已关闭。" });
  }
}

function settleSession(result: SelectionResult): void {
  const session = activeSession;
  if (!session) {
    return;
  }

  session.settled = true;
  for (const entry of session.entries) {
    if (!entry.window.isDestroyed()) {
      entry.window.close();
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
    webPreferences: createSecureWebPreferences(join(__dirname, "../preload/selection.js"))
  });

  window.setAlwaysOnTop(true, "screen-saver");
  window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  window.focus();

  return window;
}

function getActiveSelectionWindow(event: Electron.IpcMainEvent): BrowserWindow | null {
  const session = activeSession;
  if (!session || session.settled) {
    return null;
  }

  return session.entries.find((entry) => isWindowSender(event, entry.window))?.window ?? null;
}
