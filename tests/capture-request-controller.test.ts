import { describe, expect, it, vi } from "vitest";
import { CaptureCoordinator, type CaptureOwner } from "../src/main/captureCoordinator";
import { CaptureRequestController } from "../src/main/captureRequestController";
import type { ExportRecordingRequest } from "../src/shared/types";

const owner: CaptureOwner = {
  webContentsId: 11,
  frame: { processId: 21, routingId: 31 }
};

describe("CaptureRequestController", () => {
  it("rejects a malformed export without changing the active capture session", async () => {
    const coordinator = createCapturingCoordinator();
    const controller = new CaptureRequestController({ coordinator, exportRecording: vi.fn() });

    await expect(controller.export(owner, { ...createRequest(), sessionId: "" })).rejects.toThrow("录制会话无效");
    expect(coordinator.getSnapshot()).toMatchObject({ phase: "capturing", sessionId: "session-1" });
  });

  it("finishes and restores the session when export fails", async () => {
    const restore = vi.fn();
    const coordinator = createCapturingCoordinator(restore);
    const controller = new CaptureRequestController({
      coordinator,
      exportRecording: vi.fn(async () => {
        throw new Error("export failed");
      })
    });

    await expect(controller.export(owner, createRequest())).rejects.toThrow("export failed");
    expect(coordinator.getSnapshot()).toEqual({ phase: "idle" });
    expect(restore).toHaveBeenCalledTimes(1);
  });
});

function createCapturingCoordinator(restore = vi.fn()): CaptureCoordinator {
  const coordinator = new CaptureCoordinator({ createSessionId: () => "session-1" });
  coordinator.prepare(owner, 7, { hide: vi.fn(), restore });
  coordinator.claimDisplayMedia(owner.frame);
  return coordinator;
}

function createRequest(): ExportRecordingRequest {
  return {
    sessionId: "session-1",
    data: new ArrayBuffer(3),
    format: "gif",
    durationSeconds: 1,
    region: {
      displayId: 7,
      displayLabel: "Test Display",
      displayBounds: { x: 0, y: 0, width: 1280, height: 720 },
      displayScaleFactor: 2,
      bounds: { x: 10, y: 20, width: 300, height: 200 },
      physicalBounds: { x: 20, y: 40, width: 600, height: 400 }
    },
    capturedSize: { width: 2560, height: 1440 }
  };
}
