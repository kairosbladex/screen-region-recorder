import { isExportFormat, isRecordingDuration } from "./options";
import type { CaptureRegion, ExportRecordingRequest, Rectangle, VideoSize } from "./types";

export function assertExportRecordingRequest(value: unknown): ExportRecordingRequest {
  if (!isRecord(value)) {
    throw new Error("导出请求无效。");
  }

  if (!isArrayBuffer(value.data)) {
    throw new Error("导出数据无效。");
  }

  if (typeof value.format !== "string" || !isExportFormat(value.format)) {
    throw new Error("导出格式无效。");
  }

  if (typeof value.durationSeconds !== "number" || !isRecordingDuration(value.durationSeconds)) {
    throw new Error("录制时长无效。");
  }

  assertCaptureRegion(value.region);
  assertVideoSize(value.capturedSize);

  return value as unknown as ExportRecordingRequest;
}

function assertCaptureRegion(value: unknown): asserts value is CaptureRegion {
  if (!isRecord(value)) {
    throw new Error("录制区域无效。");
  }

  if (typeof value.displayId !== "number" || !Number.isInteger(value.displayId)) {
    throw new Error("录制区域显示器 ID 无效。");
  }

  if (typeof value.displayLabel !== "string") {
    throw new Error("录制区域显示器名称无效。");
  }

  if (typeof value.displayScaleFactor !== "number" || value.displayScaleFactor <= 0 || !Number.isFinite(value.displayScaleFactor)) {
    throw new Error("录制区域显示器缩放无效。");
  }

  assertRectangle(value.displayBounds, "录制区域显示器边界");
  assertRectangle(value.bounds, "录制区域边界");
  assertRectangle(value.physicalBounds, "录制区域物理边界");
}

function assertVideoSize(value: unknown): asserts value is VideoSize {
  if (!isRecord(value)) {
    throw new Error("捕获视频尺寸无效。");
  }

  assertPositiveNumber(value.width, "捕获视频宽度");
  assertPositiveNumber(value.height, "捕获视频高度");
}

function assertRectangle(value: unknown, label: string): asserts value is Rectangle {
  if (!isRecord(value)) {
    throw new Error(`${label}无效。`);
  }

  assertFiniteNumber(value.x, `${label} x`);
  assertFiniteNumber(value.y, `${label} y`);
  assertPositiveNumber(value.width, `${label}宽度`);
  assertPositiveNumber(value.height, `${label}高度`);
}

function assertFiniteNumber(value: unknown, label: string): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label}无效。`);
  }
}

function assertPositiveNumber(value: unknown, label: string): void {
  if (typeof value !== "number" || value <= 0 || !Number.isFinite(value)) {
    throw new Error(`${label}无效。`);
  }
}

function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return value instanceof ArrayBuffer || Object.prototype.toString.call(value) === "[object ArrayBuffer]";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
