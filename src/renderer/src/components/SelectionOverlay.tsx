import { useEffect, useMemo, useState } from "react";
import { hasUsableSelection, normalizeRectangle } from "../../../shared/coordinates";
import type { Rectangle } from "../../../shared/types";

interface DragState {
  start: { x: number; y: number };
  current: { x: number; y: number };
}

export function SelectionOverlay() {
  const params = new URLSearchParams(window.location.search);
  const displayId = Number(params.get("displayId"));
  const [drag, setDrag] = useState<DragState | null>(null);

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
        window.screenClip.cancelSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.focus();

    return () => {
      document.body.style.background = origBg;
      document.documentElement.style.background = origHtmlBg;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <main
      className="selection-overlay"
      onPointerDown={(event) => {
        const point = { x: event.clientX, y: event.clientY };
        setDrag({ start: point, current: point });
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!drag) {
          return;
        }

        setDrag((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            current: { x: event.clientX, y: event.clientY }
          };
        });
      }}
      onPointerUp={(event) => {
        if (!drag) {
          return;
        }

        const finalRect = normalizeRectangle(drag.start, { x: event.clientX, y: event.clientY });
        if (hasUsableSelection(finalRect) && Number.isFinite(displayId)) {
          window.screenClip.completeSelection(displayId, finalRect);
        } else {
          window.screenClip.cancelSelection();
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
