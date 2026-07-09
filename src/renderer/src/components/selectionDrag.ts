import { normalizeRectangle } from "../../../shared/coordinates";
import type { Rectangle } from "../../../shared/types";

export interface SelectionPoint {
  x: number;
  y: number;
}

export interface DragState {
  start: SelectionPoint;
  current: SelectionPoint;
}

type DragChangeHandler = (drag: DragState | null) => void;

export function createSelectionDragTracker(onChange: DragChangeHandler) {
  let activeDrag: DragState | null = null;

  function setActiveDrag(next: DragState | null): void {
    activeDrag = next;
    onChange(next);
  }

  return {
    begin(point: SelectionPoint): void {
      setActiveDrag({ start: point, current: point });
    },

    move(point: SelectionPoint): void {
      if (!activeDrag) {
        return;
      }

      setActiveDrag({
        start: activeDrag.start,
        current: point
      });
    },

    finish(point: SelectionPoint): Rectangle | null {
      if (!activeDrag) {
        return null;
      }

      const rect = normalizeRectangle(activeDrag.start, point);
      setActiveDrag(null);
      return rect;
    },

    cancel(): boolean {
      if (!activeDrag) {
        return false;
      }

      setActiveDrag(null);
      return true;
    },

    getActive(): DragState | null {
      return activeDrag;
    }
  };
}
