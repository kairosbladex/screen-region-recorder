import { describe, expect, it } from "vitest";
import { createSelectionDragTracker, type DragState } from "../src/renderer/src/components/selectionDrag";

describe("createSelectionDragTracker", () => {
  it("finishes a drag even when pointer up happens before React can re-render", () => {
    const changes: Array<DragState | null> = [];
    const tracker = createSelectionDragTracker((drag) => changes.push(drag));

    tracker.begin({ x: 10, y: 12 });
    const rect = tracker.finish({ x: 30, y: 42 });

    expect(rect).toEqual({ x: 10, y: 12, width: 20, height: 30 });
    expect(tracker.getActive()).toBeNull();
    expect(changes).toEqual([
      { start: { x: 10, y: 12 }, current: { x: 10, y: 12 } },
      null
    ]);
  });

  it("updates the active drag from synchronous state", () => {
    const changes: Array<DragState | null> = [];
    const tracker = createSelectionDragTracker((drag) => changes.push(drag));

    tracker.begin({ x: 20, y: 20 });
    tracker.move({ x: 12, y: 8 });
    const rect = tracker.finish({ x: 10, y: 6 });

    expect(rect).toEqual({ x: 10, y: 6, width: 10, height: 14 });
    expect(changes.at(-2)).toEqual({ start: { x: 20, y: 20 }, current: { x: 12, y: 8 } });
  });

  it("reports whether cancel cleared an active drag", () => {
    const changes: Array<DragState | null> = [];
    const tracker = createSelectionDragTracker((drag) => changes.push(drag));

    expect(tracker.cancel()).toBe(false);

    tracker.begin({ x: 0, y: 0 });
    expect(tracker.cancel()).toBe(true);
    expect(tracker.finish({ x: 20, y: 20 })).toBeNull();
    expect(changes.at(-1)).toBeNull();
  });
});
