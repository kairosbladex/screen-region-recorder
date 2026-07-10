import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import ffmpegStaticPath from "ffmpeg-static";
import { describe, expect, it } from "vitest";
import { transcodeRecordingWithBinary } from "../src/main/ffmpeg";
import type { CaptureRegion, ExportFormat } from "../src/shared/types";

describe("ffmpeg export", () => {
  it("uses the packaged FFmpeg binary to export cropped GIF, MP4 and WebM files", async () => {
    expect(ffmpegStaticPath).toBeTruthy();
    const tempDir = mkdtempSync(join(tmpdir(), "screen-region-recorder-test-"));
    const inputPath = join(tempDir, "input.webm");

    try {
      await run(ffmpegStaticPath as string, [
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

      for (const format of ["gif", "mp4", "webm"] satisfies ExportFormat[]) {
        const outputPath = join(tempDir, `output.${format}`);
        const rawFramePath = join(tempDir, `frame-${format}.rgb`);

        await transcodeRecordingWithBinary(ffmpegStaticPath as string, {
          inputPath,
          outputPath,
          format,
          region,
          capturedSize: { width: 640, height: 360 }
        });
        await run(ffmpegStaticPath as string, [
          "-y",
          "-hide_banner",
          "-i",
          outputPath,
          "-frames:v",
          "1",
          "-pix_fmt",
          "rgb24",
          "-f",
          "rawvideo",
          rawFramePath
        ]);

        expect(statSync(rawFramePath).size, format).toBe(120 * 80 * 3);
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }, 60000);
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
