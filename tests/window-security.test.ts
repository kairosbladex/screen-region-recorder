import { describe, expect, it, vi } from "vitest";
import { createSecureWebPreferences, hardenWindowNavigation, isAllowedRendererNavigation } from "../src/main/windowSecurity";

describe("isAllowedRendererNavigation", () => {
  it("allows reloads of the expected production renderer only", () => {
    const expected = "file:///app/out/renderer/index.html?mode=app";

    expect(isAllowedRendererNavigation(expected, expected)).toBe(true);
    expect(isAllowedRendererNavigation("file:///app/out/renderer/index.html?mode=selection", expected)).toBe(false);
    expect(isAllowedRendererNavigation("https://example.com/", expected)).toBe(false);
  });

  it("allows the exact development entry while rejecting another local service", () => {
    const expected = "http://localhost:5173/?mode=selection";

    expect(isAllowedRendererNavigation(expected, expected)).toBe(true);
    expect(isAllowedRendererNavigation("http://localhost:3000/?mode=selection", expected)).toBe(false);
    expect(isAllowedRendererNavigation("http://localhost:5173/admin", expected)).toBe(false);
  });

  it("denies new windows and unexpected navigations or redirects", () => {
    const handlers = new Map<string, (event: { url: string; preventDefault: () => void }) => void>();
    const setWindowOpenHandler = vi.fn();
    const window = {
      webContents: {
        setWindowOpenHandler,
        on: vi.fn((event: string, handler: (event: { url: string; preventDefault: () => void }) => void) => handlers.set(event, handler))
      }
    };

    hardenWindowNavigation(window as never, "https://allowed.test/app");

    expect(setWindowOpenHandler.mock.calls[0]?.[0]()).toEqual({ action: "deny" });
    expect([...handlers.keys()].sort()).toEqual(["will-navigate", "will-redirect"]);

    const preventDefault = vi.fn();
    handlers.get("will-redirect")?.({ url: "https://other.test/", preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it("creates sandboxed web preferences for each preload adapter", () => {
    expect(createSecureWebPreferences("/app/preload.js")).toEqual({
      preload: "/app/preload.js",
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    });
  });
});
