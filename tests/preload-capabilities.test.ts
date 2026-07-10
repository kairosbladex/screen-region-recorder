import { beforeEach, describe, expect, it, vi } from "vitest";

const electron = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn(),
  invoke: vi.fn(),
  send: vi.fn()
}));

vi.mock("electron", () => ({
  contextBridge: { exposeInMainWorld: electron.exposeInMainWorld },
  ipcRenderer: { invoke: electron.invoke, send: electron.send }
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("preload capabilities", () => {
  it("exposes only recorder capabilities to the main window", async () => {
    await import("../src/preload/app");

    expect(electron.exposeInMainWorld).toHaveBeenCalledTimes(1);
    const [name, api] = electron.exposeInMainWorld.mock.calls[0] as [string, Record<string, unknown>];
    expect(name).toBe("screenClip");
    expect(Object.keys(api).sort()).toEqual(
      [
        "exportRecording",
        "finishCapture",
        "getAppInfo",
        "openOutputDir",
        "openScreenSettings",
        "prepareCapture",
        "revealFile",
        "selectRegion"
      ].sort()
    );
  });

  it("exposes only selection capabilities to overlay windows", async () => {
    await import("../src/preload/selection");

    expect(electron.exposeInMainWorld).toHaveBeenCalledTimes(1);
    const [name, api] = electron.exposeInMainWorld.mock.calls[0] as [string, Record<string, unknown>];
    expect(name).toBe("selectionClip");
    expect(Object.keys(api).sort()).toEqual(["cancelSelection", "completeSelection"]);
  });
});
