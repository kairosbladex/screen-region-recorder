import { describe, expect, it, vi } from "vitest";
import { CaptureCoordinator, type CaptureOwner } from "../src/main/captureCoordinator";

const owner: CaptureOwner = {
  webContentsId: 11,
  frame: { processId: 21, routingId: 31 }
};

describe("CaptureCoordinator", () => {
  it("owns the capture lifecycle from prepare through export and finish", () => {
    const restoreWindow = vi.fn();
    const coordinator = new CaptureCoordinator({ createSessionId: () => "session-1" });

    expect(coordinator.getSnapshot()).toEqual({ phase: "idle" });

    const preparation = coordinator.prepare(owner, 42, createWindowControl(restoreWindow));
    expect(preparation).toEqual({ sessionId: "session-1" });
    expect(coordinator.claimDisplayMedia(owner.frame)).toEqual({ sessionId: "session-1", displayId: 42 });

    coordinator.beginExport(owner, "session-1");
    expect(coordinator.getSnapshot()).toMatchObject({ phase: "exporting", sessionId: "session-1", displayId: 42 });

    coordinator.finish(owner, "session-1");
    expect(coordinator.getSnapshot()).toEqual({ phase: "idle" });
    expect(restoreWindow).toHaveBeenCalledTimes(1);
  });

  it("rejects a second prepare without replacing the active session", () => {
    const coordinator = new CaptureCoordinator({ createSessionId: () => "session-1" });
    coordinator.prepare(owner, 1, createWindowControl());

    expect(() =>
      coordinator.prepare(
        { webContentsId: 12, frame: { processId: 22, routingId: 32 } },
        2,
        createWindowControl()
      )
    ).toThrow("已有录制任务正在进行");
    expect(coordinator.getSnapshot()).toMatchObject({ phase: "prepared", sessionId: "session-1", displayId: 1 });
  });

  it("rejects the wrong owner, frame and session token", () => {
    const coordinator = new CaptureCoordinator({ createSessionId: () => "session-1" });
    coordinator.prepare(owner, 7, createWindowControl());

    expect(() => coordinator.claimDisplayMedia({ processId: 21, routingId: 99 })).toThrow("录制请求来源无效");
    expect(() => coordinator.beginExport({ ...owner, webContentsId: 99 }, "session-1")).toThrow("录制请求来源无效");
    expect(() => coordinator.finish(owner, "wrong-session")).toThrow("录制会话无效");
    expect(coordinator.getSnapshot()).toMatchObject({ phase: "prepared", sessionId: "session-1" });
  });

  it("finishes the same session idempotently and restores the window once", () => {
    const restoreWindow = vi.fn();
    const coordinator = new CaptureCoordinator({ createSessionId: () => "session-1" });
    coordinator.prepare(owner, 7, createWindowControl(restoreWindow));

    coordinator.finish(owner, "session-1");
    coordinator.finish(owner, "session-1");

    expect(() =>
      coordinator.finish({ ...owner, frame: { processId: owner.frame.processId, routingId: 99 } }, "session-1")
    ).toThrow("录制请求来源无效");

    expect(coordinator.getSnapshot()).toEqual({ phase: "idle" });
    expect(restoreWindow).toHaveBeenCalledTimes(1);
  });

  it("cleans up when the owner renderer is gone", () => {
    const restoreWindow = vi.fn();
    const coordinator = new CaptureCoordinator({ createSessionId: () => "session-1" });
    coordinator.prepare(owner, 7, createWindowControl(restoreWindow));

    expect(coordinator.finishOwner(owner.webContentsId)).toBe(true);
    expect(coordinator.finishOwner(owner.webContentsId)).toBe(false);
    expect(coordinator.getSnapshot()).toEqual({ phase: "idle" });
    expect(restoreWindow).toHaveBeenCalledTimes(1);
  });

  it("aborts only the active session after a display source failure", () => {
    const restoreWindow = vi.fn();
    const coordinator = new CaptureCoordinator({ createSessionId: () => "session-1" });
    coordinator.prepare(owner, 7, createWindowControl(restoreWindow));
    coordinator.claimDisplayMedia(owner.frame);

    expect(() => coordinator.abort("wrong-session")).toThrow("录制会话无效");
    expect(coordinator.getSnapshot()).toMatchObject({ phase: "capturing", sessionId: "session-1" });

    coordinator.abort("session-1");
    expect(coordinator.getSnapshot()).toEqual({ phase: "idle" });
    expect(restoreWindow).toHaveBeenCalledTimes(1);
  });

  it("does not create an active session when hiding the window fails", () => {
    const restoreWindow = vi.fn();
    const coordinator = new CaptureCoordinator({ createSessionId: () => "session-1" });

    expect(() =>
      coordinator.prepare(owner, 7, {
        hide: () => {
          throw new Error("window closed");
        },
        restore: restoreWindow
      })
    ).toThrow("window closed");

    expect(coordinator.getSnapshot()).toEqual({ phase: "idle" });
    expect(restoreWindow).toHaveBeenCalledTimes(1);
  });
});

function createWindowControl(restore = vi.fn()) {
  return {
    hide: vi.fn(),
    restore
  };
}
