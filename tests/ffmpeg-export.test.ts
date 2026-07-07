import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { describe, expect, it } from "vitest";
import { transcodeRecording, getFfmpegInfo } from "../src/main/ffmpeg";
import type { CaptureRegion } from "../src/shared/types";

describe("ffmpeg export", () => {
  it("exports a cropped MP4 from a WebM recording source", async () => {
    const ffmpeg = await getFfmpegInfo();
    if (!ffmpeg.available || !ffmpeg.path) {
      console.warn("Skipping FFmpeg export test because FFmpeg is not available.");
      return;
    }

    const tempDir = mkdtempSync(join(tmpdir(), "screen-region-recorder-test-"));
    const inputPath = join(tempDir, "input.webm");
    const outputPath = join(tempDir, "output.mp4");

    try {
      await run(ffmpeg.path, [
        "-y",
        "-hide_banner",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=640x360:rate=15:duration=1",
        "-c:v",
        "libvpx-vp9",
        "-b:v",
        "0",
        "-crf",
        "32",
        inputPath
      ]);

      const region: CaptureRegion = {
        displayId: 1,
        displayLabel: "Test Display",
        displayBounds: { x: 0, y: 0, width: 640, height: 360 },
        displayScaleFactor: 1,
        bounds: { x: 100, y: 50, width: 120, height: 80 },
        physicalBounds: { x: 100, y: 50, width: 120, height: 80 }
      };

      await transcodeRecording({
        inputPath,
        outputPath,
        format: "mp4",
        region,
        capturedSize: { width: 640, height: 360 }
      });

      const metadata = JSON.parse(
        await runWithStdout("ffprobe", [
          "-v",
          "error",
          "-select_streams",
          "v:0",
          "-show_entries",
          "stream=width,height",
          "-of",
          "json",
          outputPath
        ])
      ) as { streams: Array<{ width: number; height: number }> };

      expect(metadata.streams[0]).toEqual({ width: 120, height: 80 });
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }, 20000);
});

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} failed with code ${code}: ${stderr}`));
      }
    });
  });
}

function runWithStdout(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`${command} failed with code ${code}: ${stderr}`));
      }
    });
  });
}
