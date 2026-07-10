import { describe, expect, it } from "vitest";
import { assertSelectionRectangle } from "../src/shared/selectionRequest";

describe("assertSelectionRectangle", () => {
  it("accepts a finite rectangle", () => {
    const rect = { x: 10, y: 20, width: 300, height: 200 };
    expect(assertSelectionRectangle(rect)).toBe(rect);
  });

  it("rejects malformed and non-finite rectangles", () => {
    expect(() => assertSelectionRectangle(undefined)).toThrow("框选区域无效");
    expect(() => assertSelectionRectangle({ x: Number.NaN, y: 0, width: 10, height: 10 })).toThrow("框选区域无效");
    expect(() => assertSelectionRectangle({ x: 0, y: 0, width: -1, height: 10 })).toThrow("框选区域无效");
    expect(() => assertSelectionRectangle({ x: 0, y: 0, width: 10, height: Number.POSITIVE_INFINITY })).toThrow("框选区域无效");
  });
});
