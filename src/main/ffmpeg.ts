import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import ffmpegStaticPath from "ffmpeg-static";
import { calculateCropFromCapturedVideo, normalizeCropForVideoCodec } from "../shared/coordinates";
import type { CaptureRegion, ExportFormat, FfmpegInfo, VideoSize } from "../shared/types";

interface TranscodeOptions {
  inputPath: string;
  outputPath: string;
  format: ExportFormat;
  region: CaptureRegion;
  capturedSize: VideoSize;
}

let cachedFfmpegInfo: FfmpegInfo | null = null;

export async function getFfmpegInfo(): Promise<FfmpegInfo> {
  if (cachedFfmpegInfo) {
    return cachedFfmpegInfo;
  }

  const localPath = await findLocalFfmpeg();
  if (localPath) {
    cachedFfmpegInfo = {
      available: true,
      path: localPath,
      source: "local",
      message: `已找到本机 FFmpeg：${localPath}`
    };
    return cachedFfmpegInfo;
  }

  const packagedPath = findPackagedFfmpeg();
  if (packagedPath) {
    cachedFfmpegInfo = {
      available: true,
      path: packagedPath,
      source: "packaged",
      message: `已找到打包 FFmpeg：${packagedPath}`
    };
    return cachedFfmpegInfo;
  }

  cachedFfmpegInfo = {
    available: false,
    message: "未找到 FFmpeg。请先安装本机 ffmpeg，或使用包含 ffmpeg-static 的打包版本。"
  };
  return cachedFfmpegInfo;
}

export async function transcodeRecording(options: TranscodeOptions): Promise<void> {
  const ffmpeg = await getFfmpegInfo();
  if (!ffmpeg.available || !ffmpeg.path) {
    throw new Error(ffmpeg.message);
  }

  const crop = calculateCropFromCapturedVideo(options.region, options.capturedSize);
  const finalCrop = options.format === "gif" ? crop : normalizeCropForVideoCodec(crop, options.capturedSize);
  const cropFilter = `crop=${finalCrop.width}:${finalCrop.height}:${finalCrop.x}:${finalCrop.y}`;
  const args = createFfmpegArgs(options.inputPath, options.outputPath, options.format, cropFilter);

  await runFfmpeg(ffmpeg.path, args);
}

function createFfmpegArgs(inputPath: string, outputPath: string, format: ExportFormat, cropFilter: string): string[] {
  if (format === "gif") {
    return [
      "-y",
      "-hide_banner",
      "-i",
      inputPath,
      "-filter_complex",
      `[0:v]${cropFilter},fps=12,split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=sierra2_4a`,
      outputPath
    ];
  }

  if (format === "mp4") {
    return [
      "-y",
      "-hide_banner",
      "-i",
      inputPath,
      "-vf",
      cropFilter,
      "-an",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outputPath
    ];
  }

  return [
    "-y",
    "-hide_banner",
    "-i",
    inputPath,
    "-vf",
    cropFilter,
    "-an",
    "-c:v",
    "libvpx-vp9",
    "-b:v",
    "0",
    "-crf",
    "32",
    outputPath
  ];
}

function runFfmpeg(binaryPath: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, args, { windowsHide: true });
    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(new Error(`FFmpeg 启动失败：${error.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`FFmpeg 导出失败，退出码 ${code ?? "unknown"}：${trimFfmpegError(stderr)}`));
    });
  });
}

function trimFfmpegError(stderr: string): string {
  const lines = stderr
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.slice(-8).join("\n") || "没有 FFmpeg 错误输出。";
}

function findPackagedFfmpeg(): string | null {
  const executableName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const candidates = [
    join(process.resourcesPath, "app.asar.unpacked", "node_modules", "ffmpeg-static", executableName),
    join(process.resourcesPath, "ffmpeg-static", executableName),
    ffmpegStaticPath
  ].filter(Boolean) as string[];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function findLocalFfmpeg(): Promise<string | null> {
  const lookupCommand = process.platform === "win32" ? "where" : "which";

  return new Promise((resolve) => {
    const child = spawn(lookupCommand, ["ffmpeg"], { windowsHide: true });
    let stdout = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.on("error", () => {
      resolve(null);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        resolve(null);
        return;
      }

      const firstPath = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean);

      resolve(firstPath && existsSync(firstPath) ? firstPath : null);
    });
  });
}
