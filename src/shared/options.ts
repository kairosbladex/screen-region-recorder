import type { ExportFormat, RecordingDuration } from "./types";

export const RECORDING_DURATIONS: RecordingDuration[] = [5, 10, 15];
export const EXPORT_FORMATS: ExportFormat[] = ["gif", "mp4", "webm"];

export function isRecordingDuration(value: number): value is RecordingDuration {
  return RECORDING_DURATIONS.includes(value as RecordingDuration);
}

export function assertRecordingDuration(value: number): RecordingDuration {
  if (!isRecordingDuration(value)) {
    throw new Error("录制时长只能选择 5 秒、10 秒或 15 秒。");
  }

  return value;
}

export function isExportFormat(value: string): value is ExportFormat {
  return EXPORT_FORMATS.includes(value as ExportFormat);
}
