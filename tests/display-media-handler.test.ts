import { describe, expect, it, vi } from "vitest";
import { CaptureCoordinator, type CaptureOwner } from "../src/main/captureCoordinator";
import { createDisplayMediaRequestHandler } from "../src/main/displayMediaHandler";

const owner: CaptureOwner = {
  webContentsId: 11,
  frame: { processId: 21, routingId: 31 }
};

const request = {
  frame: { ...owner.frame, parent: null },
  videoRequested: true,
  audioRequested: false
};

describe("display media handler", () => {
  it("rejects ineligible requests without claiming the prepared session", async () => {
    const coordinator = prepareCoordinator();
    const callback = vi.fn();
    const handler = createDisplayMediaRequestHandler({ coordinator, getSourceForDisplay: vi.fn() });

    await handler({ ...request, audioRequested: true } as never, callback);

    expect(callback).toHaveBeenCalledWith({});
    expect(coordinator.getSnapshot()).toMatchObject({ phase: "prepared", sessionId: "session-1" });
  });

  it("aborts and restores the window when the claimed source is unavailable", async () => {
    const restore = vi.fn();
    const coordinator = prepareCoordinator(restore);
    const callback = vi.fn();
    const handler = createDisplayMediaRequestHandler({ coordinator, getSourceForDisplay: vi.fn(async () => null) });

    await handler(request as never, callback);

    expect(callback).toHaveBeenCalledWith({});
    expect(coordinator.getSnapshot()).toEqual({ phase: "idle" });
    expect(restore).toHaveBeenCalledTimes(1);
  });

  it("does not return a source or abort a newer session when the owner disappears during source lookup", async () => {
    const coordinator = prepareCoordinator();
    const callback = vi.fn();
    const source = { id: "screen:7" };
    const handler = createDisplayMediaRequestHandler({
      coordinator,
      getSourceForDisplay: vi.fn(async () => {
        coordinator.finishOwner(owner.webContentsId);
        coordinator.prepare(owner, 8, { hide: vi.fn(), restore: vi.fn() });
        return source as never;
      })
    });

    await handler(request as never, callback);

    expect(callback).toHaveBeenCalledWith({});
    expect(callback).not.toHaveBeenCalledWith({ video: source });
    expect(coordinator.getSnapshot()).toMatchObject({ phase: "prepared", displayId: 8 });
  });

  it("returns the selected source for the active owner session", async () => {
    const coordinator = prepareCoordinator();
    const callback = vi.fn();
    const source = { id: "screen:7" };
    const handler = createDisplayMediaRequestHandler({ coordinator, getSourceForDisplay: vi.fn(async () => source as never) });

    await handler(request as never, callback);

    expect(callback).toHaveBeenCalledWith({ video: source });
    expect(coordinator.getSnapshot()).toMatchObject({ phase: "capturing", sessionId: "session-1" });
  });
});

function prepareCoordinator(restore = vi.fn()): CaptureCoordinator {
  const coordinator = new CaptureCoordinator({ createSessionId: () => "session-1" });
  coordinator.prepare(owner, 7, { hide: vi.fn(), restore });
  return coordinator;
}
