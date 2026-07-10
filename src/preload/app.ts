import { contextBridge, ipcRenderer } from "electron";
import type {
  AppInfo,
  CapturePreparation,
  ExportRecordingRequest,
  ExportRecordingResult,
  SelectionResult
} from "../shared/types";

const api = {
  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke("screenclip:get-app-info"),
  openScreenSettings: (): Promise<void> => ipcRenderer.invoke("screenclip:open-screen-settings"),
  selectRegion: (): Promise<SelectionResult> => ipcRenderer.invoke("screenclip:select-region"),
  prepareCapture: (displayId: number): Promise<CapturePreparation> => ipcRenderer.invoke("screenclip:prepare-capture", displayId),
  finishCapture: (sessionId: string): Promise<void> => ipcRenderer.invoke("screenclip:finish-capture", sessionId),
  exportRecording: (request: ExportRecordingRequest): Promise<ExportRecordingResult> =>
    ipcRenderer.invoke("screenclip:export-recording", request),
  openOutputDir: (): Promise<void> => ipcRenderer.invoke("screenclip:open-output-dir"),
  revealFile: (filePath: string): Promise<void> => ipcRenderer.invoke("screenclip:reveal-file", filePath)
};

contextBridge.exposeInMainWorld("screenClip", api);

export type MainWindowApi = typeof api;
