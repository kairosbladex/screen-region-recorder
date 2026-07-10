import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createOutputFilePath } from "../shared/outputPaths";
import type { ExportRecordingRequest, ExportRecordingResult } from "../shared/types";
import type { TranscodeOptions } from "./ffmpeg";

interface RecordingExporterDependencies {
  downloadsDir: string;
  transcode(options: TranscodeOptions): Promise<void>;
  now?: () => Date;
  createStagingId?: () => string;
}

export async function exportRecordingToFile(
  request: ExportRecordingRequest,
  dependencies: RecordingExporterDependencies
): Promise<ExportRecordingResult> {
  const now = dependencies.now ?? (() => new Date());
  const createStagingId = dependencies.createStagingId ?? randomUUID;
  const outputPath = createOutputFilePath(dependencies.downloadsDir, now(), request.durationSeconds, request.format);
  const outputDir = dirname(outputPath);
  let tempDir: string | null = null;
  let partialOutputPath: string | null = null;

  try {
    mkdirSync(outputDir, { recursive: true });
    tempDir = mkdtempSync(join(tmpdir(), "screen-region-recorder-"));
    const inputPath = join(tempDir, "capture.webm");
    partialOutputPath = join(outputDir, `.screenclip-${createStagingId()}.partial.${request.format}`);
    writeFileSync(inputPath, Buffer.from(new Uint8Array(request.data)));

    await dependencies.transcode({
      inputPath,
      outputPath: partialOutputPath,
      format: request.format,
      region: request.region,
      capturedSize: request.capturedSize
    });
    renameSync(partialOutputPath, outputPath);
    partialOutputPath = null;

    return {
      ok: true,
      filePath: outputPath,
      outputDir
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    if (partialOutputPath) {
      rmSync(partialOutputPath, { force: true });
    }
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}
