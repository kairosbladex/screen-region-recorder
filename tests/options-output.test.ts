import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assertRecordingDuration, isExportFormat, isRecordingDuration } from "../src/shared/options";
import { createOutputFileName, createOutputFilePath } from "../src/shared/outputPaths";

describe("recording options", () => {
  it("accepts only the supported duration values", () => {
    expect(isRecordingDuration(1)).toBe(true);
    expect(isRecordingDuration(5)).toBe(true);
    expect(isRecordingDuration(10)).toBe(true);
    expect(isRecordingDuration(0)).toBe(false);
    expect(isRecordingDuration(11)).toBe(false);
    expect(isRecordingDuration(15)).toBe(false);
    expect(isRecordingDuration(1.5)).toBe(false);
    expect(() => assertRecordingDuration(0)).toThrow("录制时长需在");
  });

  it("accepts the requested export formats", () => {
    expect(isExportFormat("gif")).toBe(true);
    expect(isExportFormat("mp4")).toBe(true);
    expect(isExportFormat("webm")).toBe(true);
    expect(isExportFormat("mov")).toBe(false);
  });
});

describe("output paths", () => {
  it("includes timestamp, duration and extension in Downloads/ScreenClips", () => {
    const now = new Date(2026, 6, 2, 9, 8, 7);

    expect(createOutputFileName(now, 10, "mp4")).toBe("screenclip-20260702-090807-10s.mp4");
    expect(createOutputFilePath("/Users/wangxiaolin/Downloads", now, 10, "gif")).toBe(
      join("/Users/wangxiaolin/Downloads", "ScreenClips", "screenclip-20260702-090807-10s.gif")
    );
  });
});
