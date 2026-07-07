import type { CaptureRegion, ExportFormat, ExportRecordingResult, RecordingDuration, VideoSize } from "../../../shared/types";

export type RecordingPhase = "recording" | "exporting";

export interface RecordingProgress {
  elapsedMs: number;
  remainingMs: number;
  percent: number;
}

interface RecordSelectionOptions {
  region: CaptureRegion;
  durationSeconds: RecordingDuration;
  format: ExportFormat;
  onProgress: (progress: RecordingProgress) => void;
  onPhase: (phase: RecordingPhase) => void;
}

export async function recordSelectedRegion(options: RecordSelectionOptions): Promise<ExportRecordingResult> {
  if (!window.MediaRecorder) {
    throw new Error("当前 Electron/Chromium 环境不支持 MediaRecorder。");
  }

  const permission = await window.screenClip.checkPermission();
  if (permission.platform === "darwin" && permission.status !== "granted") {
    throw new Error(permission.message);
  }

  await window.screenClip.prepareCapture(options.region.displayId);

  const stream = await getDisplayStream();
  const track = stream.getVideoTracks()[0];
  const capturedSize = getCapturedSize(track, options.region);

  try {
    const blob = await recordStream(stream, options.durationSeconds, options.onProgress, options.onPhase);
    options.onPhase("exporting");
    const data = await blob.arrayBuffer();

    return window.screenClip.exportRecording({
      data,
      format: options.format,
      durationSeconds: options.durationSeconds,
      region: options.region,
      capturedSize
    });
  } finally {
    for (const mediaTrack of stream.getTracks()) {
      mediaTrack.stop();
    }
  }
}

async function getDisplayStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: { ideal: 30, max: 30 }
      },
      audio: false
    });
  } catch (error) {
    throw new Error(`屏幕录制启动失败：${toReadableCaptureError(error)}`);
  }
}

function recordStream(
  stream: MediaStream,
  durationSeconds: RecordingDuration,
  onProgress: (progress: RecordingProgress) => void,
  onPhase: (phase: RecordingPhase) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const chunks: Blob[] = [];
    const mimeType = pickMediaRecorderMimeType();
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    const startedAt = Date.now();
    const durationMs = durationSeconds * 1000;

    const timer = window.setInterval(() => {
      const elapsedMs = Math.min(Date.now() - startedAt, durationMs);
      onProgress({
        elapsedMs,
        remainingMs: Math.max(durationMs - elapsedMs, 0),
        percent: Math.min(elapsedMs / durationMs, 1)
      });
    }, 200);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onerror = () => {
      window.clearInterval(timer);
      reject(new Error("MediaRecorder 录制失败。"));
    };

    recorder.onstop = () => {
      window.clearInterval(timer);
      onProgress({ elapsedMs: durationMs, remainingMs: 0, percent: 1 });
      resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
    };

    onPhase("recording");
    recorder.start(250);

    window.setTimeout(() => {
      if (recorder.state === "recording") {
        recorder.stop();
      }
    }, durationMs);
  });
}

function pickMediaRecorderMimeType(): string | undefined {
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
}

function getCapturedSize(track: MediaStreamTrack, region: CaptureRegion): VideoSize {
  const settings = track.getSettings();
  const width = Number(settings.width) || region.physicalBounds.width;
  const height = Number(settings.height) || region.physicalBounds.height;

  return { width, height };
}

function toReadableCaptureError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  if (error.name === "NotAllowedError") {
    return "没有屏幕录制权限，或用户取消了系统录屏授权。";
  }

  if (error.name === "NotFoundError") {
    return "没有找到可录制的屏幕源。";
  }

  return error.message;
}
