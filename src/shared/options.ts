import type { ExportFormat, RecordingDuration } from "./types";

export const MIN_DURATION = 1;
export const MAX_DURATION = 10;
export const DEFAULT_DURATION = 3;
export const EXPORT_FORMATS: ExportFormat[] = ["gif", "mp4", "webm"];

export function isRecordingDuration(value: number): value is RecordingDuration {
  return Number.isInteger(value) && value >= MIN_DURATION && value <= MAX_DURATION;
}

export function assertRecordingDuration(value: number): RecordingDuration {
  if (!isRecordingDuration(value)) {
    throw new Error(`录制时长需在 ${MIN_DURATION}~${MAX_DURATION} 秒范围内。`);
  }

  return value;
}

export function isExportFormat(value: string): value is ExportFormat {
  return EXPORT_FORMATS.includes(value as ExportFormat);
}
