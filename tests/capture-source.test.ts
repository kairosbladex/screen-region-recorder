import { describe, expect, it } from "vitest";
import { pickCaptureSourceByDisplayId } from "../src/shared/captureSource";

describe("pickCaptureSourceByDisplayId", () => {
  it("prefers an exact display_id match among multiple sources", () => {
    const sources = [
      { id: "screen:0", display_id: "1" },
      { id: "screen:1", display_id: "7" }
    ];

    expect(pickCaptureSourceByDisplayId(sources, 7, { displayCount: 2 })?.id).toBe("screen:1");
  });

  it("does not silently map a different display_id when match is missing on multi-display", () => {
    const sources = [
      { id: "screen:0", display_id: "1" },
      { id: "screen:1", display_id: "2" }
    ];

    expect(pickCaptureSourceByDisplayId(sources, 99, { displayCount: 2 })).toBeNull();
  });

  it("allows empty display_id fallback only on single-display systems", () => {
    expect(pickCaptureSourceByDisplayId([{ id: "screen:0", display_id: "" }], 5, { displayCount: 1 })?.id).toBe("screen:0");
    expect(pickCaptureSourceByDisplayId([{ id: "screen:0" }], 5, { displayCount: 1 })?.id).toBe("screen:0");
    expect(pickCaptureSourceByDisplayId([{ id: "screen:0", display_id: "" }], 5, { displayCount: 2 })).toBeNull();
  });

  it("rejects a mismatched display_id even when there is one source", () => {
    expect(pickCaptureSourceByDisplayId([{ id: "screen:0", display_id: "9" }], 5, { displayCount: 1 })).toBeNull();
  });
});
