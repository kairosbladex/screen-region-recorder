export type RecordingDuration = number;
export type ExportFormat = "gif" | "mp4" | "webm";

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DisplayInfo {
  id: number;
  label: string;
  bounds: Rectangle;
  workArea: Rectangle;
  scaleFactor: number;
}

export interface CaptureRegion {
  displayId: number;
  displayLabel: string;
  displayBounds: Rectangle;
  displayScaleFactor: number;
  bounds: Rectangle;
  physicalBounds: Rectangle;
}

export interface VideoSize {
  width: number;
  height: number;
}

export interface CropRectangle extends Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectionCompletePayload {
  displayId: number;
  rect: Rectangle;
}

export interface SelectionResult {
  ok: boolean;
  cancelled?: boolean;
  region?: CaptureRegion;
  error?: string;
}

export type ScreenPermissionStatus =
  | "granted"
  | "denied"
  | "restricted"
  | "not-determined"
  | "unknown";

export interface PermissionInfo {
  platform: NodeJS.Platform;
  status: ScreenPermissionStatus;
  canOpenSettings: boolean;
  message: string;
}

export interface FfmpegInfo {
  available: boolean;
  path?: string;
  source?: "local" | "packaged";
  message: string;
}

export interface AppInfo {
  outputDir: string;
  permission: PermissionInfo;
  ffmpeg: FfmpegInfo;
}

export interface CaptureSourceInfo {
  sourceId: string;
  sourceName: string;
  display: DisplayInfo;
}

export interface ExportRecordingRequest {
  data: ArrayBuffer;
  format: ExportFormat;
  durationSeconds: RecordingDuration;
  region: CaptureRegion;
  capturedSize: VideoSize;
}

export interface ExportRecordingResult {
  ok: boolean;
  filePath?: string;
  outputDir?: string;
  error?: string;
}
