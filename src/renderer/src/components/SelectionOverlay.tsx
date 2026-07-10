import { useEffect, useMemo, useState } from "react";
import { hasUsableSelection, normalizeRectangle } from "../../../shared/coordinates";
import type { Rectangle } from "../../../shared/types";
import { createSelectionDragTracker, type DragState, type SelectionPoint } from "./selectionDrag";

export function SelectionOverlay() {
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragTracker = useMemo(() => createSelectionDragTracker(setDrag), []);

  const rect = useMemo<Rectangle | null>(() => {
    if (!drag) {
      return null;
    }

    return normalizeRectangle(drag.start, drag.current);
  }, [drag]);

  useEffect(() => {
    const origBg = document.body.style.background;
    const origHtmlBg = document.documentElement.style.background;
    document.body.style.background = "transparent";
    document.documentElement.style.background = "transparent";

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        dragTracker.cancel();
        window.selectionClip.cancelSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.focus();

    return () => {
      document.body.style.background = origBg;
      document.documentElement.style.background = origHtmlBg;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [dragTracker]);

  return (
    <main
      className="selection-overlay"
      onPointerDown={(event) => {
        if (event.button !== 0) {
          return;
        }

        dragTracker.begin(toSelectionPoint(event));
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        dragTracker.move(toSelectionPoint(event));
      }}
      onPointerUp={(event) => {
        const finalRect = dragTracker.finish(toSelectionPoint(event));
        if (!finalRect) {
          return;
        }

        releasePointerCapture(event);
        if (hasUsableSelection(finalRect)) {
          window.selectionClip.completeSelection(finalRect);
        } else {
          window.selectionClip.cancelSelection();
        }
      }}
      onPointerCancel={(event) => {
        releasePointerCapture(event);
        if (dragTracker.cancel()) {
          window.selectionClip.cancelSelection();
        }
      }}
      onLostPointerCapture={() => {
        if (dragTracker.cancel()) {
          window.selectionClip.cancelSelection();
        }
      }}
    >
      <div className="selection-help">拖拽选择录制区域 · Esc 取消</div>
      {rect ? (
        <div
          className="selection-box"
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height
          }}
        >
          <span>
            {Math.round(rect.width)} x {Math.round(rect.height)}
          </span>
        </div>
      ) : null}
    </main>
  );
}

function toSelectionPoint(event: React.PointerEvent): SelectionPoint {
  return { x: event.clientX, y: event.clientY };
}

function releasePointerCapture(event: React.PointerEvent): void {
  if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
    return;
  }

  event.currentTarget.releasePointerCapture(event.pointerId);
}
