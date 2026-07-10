import { afterEach, describe, expect, it, vi } from "vitest";
import { recordSelectedRegion } from "../src/renderer/src/services/screenRecorder";
import type { CaptureRegion } from "../src/shared/types";

const region: CaptureRegion = {
  displayId: 1,
  displayLabel: "Test Display",
  displayBounds: { x: 0, y: 0, width: 1512, height: 982 },
  displayScaleFactor: 2,
  bounds: { x: 100, y: 120, width: 300, height: 200 },
  physicalBounds: { x: 200, y: 240, width: 600, height: 400 }
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("recordSelectedRegion", () => {
  it("finishes the prepared session when display capture is rejected", async () => {
    const finishCapture = vi.fn(async () => undefined);
    installAdapters({
      getDisplayMedia: vi.fn(async () => {
        const error = new Error("denied");
        error.name = "NotAllowedError";
        throw error;
      }),
      finishCapture
    });

    await expect(record()).rejects.toThrow("没有屏幕录制权限");
    expect(finishCapture).toHaveBeenCalledWith("session-1");
  });

  it("stops every media track when the captured stream has no video track", async () => {
    const stop = vi.fn();
    const finishCapture = vi.fn(async () => undefined);
    installAdapters({
      getDisplayMedia: vi.fn(async () => ({
        getVideoTracks: () => [],
        getTracks: () => [{ stop }]
      })),
      finishCapture
    });

    await expect(record()).rejects.toThrow("没有找到视频轨道");
    expect(stop).toHaveBeenCalledTimes(1);
    expect(finishCapture).toHaveBeenCalledWith("session-1");
  });

  it("preserves the capture error when session cleanup also fails", async () => {
    installAdapters({
      getDisplayMedia: vi.fn(async () => {
        throw new Error("capture failed");
      }),
      finishCapture: vi.fn(async () => {
        throw new Error("cleanup failed");
      })
    });

    await expect(record()).rejects.toThrow("capture failed");
  });

  it("clears timers and stops tracks when MediaRecorder fails", async () => {
    vi.useFakeTimers();
    const stop = vi.fn();
    const finishCapture = vi.fn(async () => undefined);
    installAdapters({
      getDisplayMedia: vi.fn(async () => createStream(stop)),
      finishCapture,
      mediaRecorder: ErrorMediaRecorder
    });

    await expect(record()).rejects.toThrow("MediaRecorder 录制失败");
    expect(vi.getTimerCount()).toBe(0);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(finishCapture).toHaveBeenCalledWith("session-1");
  });

  it("clears timers when MediaRecorder.start throws synchronously", async () => {
    vi.useFakeTimers();
    const stop = vi.fn();
    installAdapters({
      getDisplayMedia: vi.fn(async () => createStream(stop)),
      finishCapture: vi.fn(async () => undefined),
      mediaRecorder: ThrowingStartMediaRecorder
    });

    await expect(record()).rejects.toThrow("start failed");
    expect(vi.getTimerCount()).toBe(0);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("exports with the session token and clears timers after the requested duration", async () => {
    vi.useFakeTimers();
    const stop = vi.fn();
    const exportRecording = vi.fn(async () => ({ ok: true, filePath: "/tmp/clip.gif" }));
    installAdapters({
      getDisplayMedia: vi.fn(async () => createStream(stop)),
      finishCapture: vi.fn(async () => undefined),
      exportRecording,
      mediaRecorder: SuccessfulMediaRecorder
    });

    const recording = record();
    await vi.advanceTimersByTimeAsync(1000);

    await expect(recording).resolves.toEqual({ ok: true, filePath: "/tmp/clip.gif" });
    expect(exportRecording).toHaveBeenCalledWith(expect.objectContaining({ sessionId: "session-1", format: "gif" }));
    expect(vi.getTimerCount()).toBe(0);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("stops every capture track before waiting for export to finish", async () => {
    vi.useFakeTimers();
    const stop = vi.fn();
    let resolveExport: ((result: { ok: true; filePath: string }) => void) | undefined;
    const exportRecording = vi.fn(
      () =>
        new Promise<{ ok: true; filePath: string }>((resolve) => {
          resolveExport = resolve;
        })
    );
    installAdapters({
      getDisplayMedia: vi.fn(async () => createStream(stop)),
      finishCapture: vi.fn(async () => undefined),
      exportRecording,
      mediaRecorder: SuccessfulMediaRecorder
    });

    const recording = record();
    await vi.advanceTimersByTimeAsync(1000);

    expect(exportRecording).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);

    resolveExport?.({ ok: true, filePath: "/tmp/clip.gif" });
    await expect(recording).resolves.toEqual({ ok: true, filePath: "/tmp/clip.gif" });
  });

  it("uses the full Retina display size when the video track omits dimensions", async () => {
    vi.useFakeTimers();
    const exportRecording = vi.fn(async () => ({ ok: true, filePath: "/tmp/clip.gif" }));
    installAdapters({
      getDisplayMedia: vi.fn(async () => createStream(vi.fn(), {})),
      finishCapture: vi.fn(async () => undefined),
      exportRecording,
      mediaRecorder: SuccessfulMediaRecorder
    });

    const recording = record();
    await vi.advanceTimersByTimeAsync(1000);
    await recording;

    expect(exportRecording).toHaveBeenCalledWith(expect.objectContaining({ capturedSize: { width: 3024, height: 1964 } }));
  });
});

function record() {
  return recordSelectedRegion({
    region,
    durationSeconds: 1,
    format: "gif",
    onProgress: vi.fn(),
    onPhase: vi.fn()
  });
}

function installAdapters(options: {
  getDisplayMedia: () => Promise<unknown>;
  finishCapture: (sessionId: string) => Promise<void>;
  exportRecording?: (request: unknown) => Promise<unknown>;
  mediaRecorder?: typeof ErrorMediaRecorder;
}): void {
  const mediaRecorder = options.mediaRecorder ?? ErrorMediaRecorder;
  vi.stubGlobal("window", {
    MediaRecorder: mediaRecorder,
    setInterval: (...args: Parameters<typeof setInterval>) => setInterval(...args),
    clearInterval: (timer: ReturnType<typeof setInterval>) => clearInterval(timer),
    setTimeout: (...args: Parameters<typeof setTimeout>) => setTimeout(...args),
    clearTimeout: (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer),
    screenClip: {
      prepareCapture: vi.fn(async () => ({ sessionId: "session-1" })),
      finishCapture: options.finishCapture,
      exportRecording: options.exportRecording ?? vi.fn()
    }
  });
  vi.stubGlobal("MediaRecorder", mediaRecorder);
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getDisplayMedia: options.getDisplayMedia
    }
  });
}

function createStream(stop: () => void, settings: MediaTrackSettings = { width: 3024, height: 1964 }) {
  const videoTrack = {
    stop,
    getSettings: () => settings
  };
  return {
    getVideoTracks: () => [videoTrack],
    getTracks: () => [videoTrack]
  };
}

class ErrorMediaRecorder {
  static isTypeSupported(): boolean {
    return true;
  }

  state = "recording";
  mimeType = "video/webm";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onerror: (() => void) | null = null;
  onstop: (() => void) | null = null;

  start(): void {
    this.onerror?.();
  }

  stop(): void {
    this.state = "inactive";
    this.onstop?.();
  }
}

class SuccessfulMediaRecorder extends ErrorMediaRecorder {
  override start(): void {}

  override stop(): void {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["capture"]) });
    this.onstop?.();
  }
}

class ThrowingStartMediaRecorder extends ErrorMediaRecorder {
  override start(): void {
    throw new Error("start failed");
  }
}
