import type { BrowserWindow, WebPreferences } from "electron";

export function hardenWindowNavigation(window: BrowserWindow, expectedUrl: string): void {
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  const preventUnexpectedNavigation = (event: Electron.Event<Electron.WebContentsWillNavigateEventParams>): void => {
    if (!isAllowedRendererNavigation(event.url, expectedUrl)) {
      event.preventDefault();
    }
  };
  window.webContents.on("will-navigate", preventUnexpectedNavigation);
  window.webContents.on("will-redirect", preventUnexpectedNavigation);
}

export function createSecureWebPreferences(preload: string): WebPreferences {
  return {
    preload,
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
  };
}

export function isAllowedRendererNavigation(targetUrl: string, expectedUrl: string): boolean {
  try {
    return new URL(targetUrl).href === new URL(expectedUrl).href;
  } catch {
    return false;
  }
}
