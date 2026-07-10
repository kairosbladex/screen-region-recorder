import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { exportRecordingToFile } from "../src/main/recordingExporter";
import type { ExportRecordingRequest } from "../src/shared/types";

describe("recording exporter", () => {
  it("atomically promotes a completed transcode to the final output name", async () => {
    const downloadsDir = mkdtempSync(join(tmpdir(), "screen-region-recorder-downloads-"));
    const transcode = vi.fn(async ({ outputPath }: { outputPath: string }) => {
      writeFileSync(outputPath, "complete-video");
    });

    try {
      const result = await exportRecordingToFile(createRequest(), {
        downloadsDir,
        now: () => new Date(2026, 6, 10, 12, 34, 56),
        createStagingId: () => "staging-id",
        transcode
      });

      expect(result).toMatchObject({ ok: true });
      expect(result.filePath && readFileSync(result.filePath, "utf8")).toBe("complete-video");
      expect(readdirSync(dirname(result.filePath as string)).filter((name) => name.includes("partial"))).toEqual([]);
    } finally {
      rmSync(downloadsDir, { recursive: true, force: true });
    }
  });

  it("removes a partial transcode and never exposes it under the final file name", async () => {
    const downloadsDir = mkdtempSync(join(tmpdir(), "screen-region-recorder-downloads-"));
    const transcode = vi.fn(async ({ outputPath }: { outputPath: string }) => {
      writeFileSync(outputPath, "broken-video");
      throw new Error("ffmpeg failed");
    });

    try {
      const result = await exportRecordingToFile(createRequest(), {
        downloadsDir,
        now: () => new Date(2026, 6, 10, 12, 34, 56),
        createStagingId: () => "staging-id",
        transcode
      });
      const finalPath = join(downloadsDir, "ScreenClips", "screenclip-20260710-123456-3s.mp4");

      expect(result).toEqual({ ok: false, error: "ffmpeg failed" });
      expect(existsSync(finalPath)).toBe(false);
      expect(readdirSync(join(downloadsDir, "ScreenClips"))).toEqual([]);
    } finally {
      rmSync(downloadsDir, { recursive: true, force: true });
    }
  });
});

function createRequest(): ExportRecordingRequest {
  return {
    sessionId: "session-1",
    data: new Uint8Array([1, 2, 3]).buffer,
    format: "mp4",
    durationSeconds: 3,
    region: {
      displayId: 1,
      displayLabel: "Test Display",
      displayBounds: { x: 0, y: 0, width: 1280, height: 720 },
      displayScaleFactor: 2,
      bounds: { x: 10, y: 20, width: 300, height: 200 },
      physicalBounds: { x: 20, y: 40, width: 600, height: 400 }
    },
    capturedSize: { width: 2560, height: 1440 }
  };
}
