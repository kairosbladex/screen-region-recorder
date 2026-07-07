import { describe, expect, it, vi } from "vitest";
import { createRendererUrl, loadRenderer } from "../src/main/rendererLoader";

describe("renderer loader", () => {
  it("uses an HTTP Vite dev server as the window entry", () => {
    const url = createRendererUrl("http://localhost:5173/", { mode: "selection", displayId: "1" }, true);

    expect(url).toBe("http://localhost:5173/?mode=selection&displayId=1");
  });

  it("does not use a bundled JavaScript asset as the window entry", () => {
    const fileUrl = createRendererUrl("file:///app/out/renderer/assets/index-HW8NBD8r.js", { mode: "app" }, true);
    const httpUrl = createRendererUrl("http://localhost:5173/assets/index-HW8NBD8r.js", { mode: "app" }, true);

    expect(fileUrl).toBeNull();
    expect(httpUrl).toBeNull();
  });

  it("ignores renderer URLs outside dev mode", () => {
    const url = createRendererUrl("http://localhost:5173/", { mode: "app" }, false);

    expect(url).toBeNull();
  });

  it("falls back to index.html when the renderer environment URL points at a bundle", async () => {
    const originalUrl = process.env.ELECTRON_RENDERER_URL;
    process.env.ELECTRON_RENDERER_URL = "file:///app/out/renderer/assets/index-HW8NBD8r.js";
    const loadFile = vi.fn(async (_path: string, _options?: unknown) => undefined);
    const loadURL = vi.fn(async (_url: string) => undefined);
    const window = { loadFile, loadURL } as unknown as Parameters<typeof loadRenderer>[0];

    try {
      await loadRenderer(window, { mode: "app" }, true);
    } finally {
      process.env.ELECTRON_RENDERER_URL = originalUrl;
    }

    expect(loadURL).not.toHaveBeenCalled();
    expect(loadFile).toHaveBeenCalledWith(expect.any(String), { query: { mode: "app" } });
    expect(String(loadFile.mock.calls[0]?.[0]).replace(/\\/g, "/")).toContain("renderer/index.html");
  });
});
