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

  const { sessionId } = await window.screenClip.prepareCapture(options.region.displayId);
  let primaryError: unknown;

  try {
    const stream = await getDisplayStream();
    try {
      const track = stream.getVideoTracks()[0];
      if (!track) {
        throw new Error("捕获的屏幕流没有找到视频轨道。");
      }
      const capturedSize = getCapturedSize(track, options.region);
      const blob = await recordStream(stream, options.durationSeconds, options.onProgress, options.onPhase);
      options.onPhase("exporting");
      const data = await blob.arrayBuffer();

      return await window.screenClip.exportRecording({
        sessionId,
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
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    try {
      await window.screenClip.finishCapture(sessionId);
    } catch (cleanupError) {
      if (primaryError === undefined) {
        throw cleanupError;
      }
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
    const recorder = mimeType ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 20_000_000 }) : new MediaRecorder(stream, { videoBitsPerSecond: 20_000_000 });
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

    const stopTimer = window.setTimeout(() => {
      if (recorder.state === "recording") {
        recorder.stop();
      }
    }, durationMs);

    const clearTimers = (): void => {
      window.clearInterval(timer);
      window.clearTimeout(stopTimer);
    };

    recorder.onerror = () => {
      clearTimers();
      reject(new Error("MediaRecorder 录制失败。"));
    };

    recorder.onstop = () => {
      clearTimers();
      onProgress({ elapsedMs: durationMs, remainingMs: 0, percent: 1 });
      resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
    };

    try {
      onPhase("recording");
      recorder.start(250);
    } catch (error) {
      clearTimers();
      reject(error);
    }
  });
}

function pickMediaRecorderMimeType(): string | undefined {
  const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
}

function getCapturedSize(track: MediaStreamTrack, region: CaptureRegion): VideoSize {
  const settings = track.getSettings();
  const width = Number(settings.width) || Math.round(region.displayBounds.width * region.displayScaleFactor);
  const height = Number(settings.height) || Math.round(region.displayBounds.height * region.displayScaleFactor);

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
