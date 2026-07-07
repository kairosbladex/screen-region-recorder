import { contextBridge, ipcRenderer } from "electron";
import type {
  AppInfo,
  CaptureSourceInfo,
  ExportRecordingRequest,
  ExportRecordingResult,
  PermissionInfo,
  Rectangle,
  SelectionResult
} from "../shared/types";

const api = {
  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke("screenclip:get-app-info"),
  checkPermission: (): Promise<PermissionInfo> => ipcRenderer.invoke("screenclip:check-permission"),
  openScreenSettings: (): Promise<void> => ipcRenderer.invoke("screenclip:open-screen-settings"),
  selectRegion: (): Promise<SelectionResult> => ipcRenderer.invoke("screenclip:select-region"),
  prepareCapture: (displayId: number): Promise<CaptureSourceInfo> => ipcRenderer.invoke("screenclip:prepare-capture", displayId),
  exportRecording: (request: ExportRecordingRequest): Promise<ExportRecordingResult> =>
    ipcRenderer.invoke("screenclip:export-recording", request),
  openOutputDir: (): Promise<void> => ipcRenderer.invoke("screenclip:open-output-dir"),
  revealFile: (filePath: string): Promise<void> => ipcRenderer.invoke("screenclip:reveal-file", filePath),
  completeSelection: (displayId: number, rect: Rectangle): void => {
    ipcRenderer.send("screenclip:selection-complete", { displayId, rect });
  },
  cancelSelection: (): void => {
    ipcRenderer.send("screenclip:selection-cancel");
  }
};

contextBridge.exposeInMainWorld("screenClip", api);

export type ScreenClipApi = typeof api;
