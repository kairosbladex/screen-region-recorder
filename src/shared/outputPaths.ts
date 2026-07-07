import { join } from "node:path";
import type { ExportFormat, RecordingDuration } from "./types";

export const OUTPUT_FOLDER_NAME = "ScreenClips";

export function createOutputFileName(now: Date, durationSeconds: RecordingDuration, format: ExportFormat): string {
  const timestamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join("");

  return `screenclip-${timestamp}-${durationSeconds}s.${format}`;
}

export function createOutputFilePath(downloadsDir: string, now: Date, durationSeconds: RecordingDuration, format: ExportFormat): string {
  return join(downloadsDir, OUTPUT_FOLDER_NAME, createOutputFileName(now, durationSeconds, format));
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}
