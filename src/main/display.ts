import type { Display } from "electron";
import type { DisplayInfo, Rectangle } from "../shared/types";

export function toDisplayInfo(display: Display): DisplayInfo {
  return {
    id: display.id,
    label: display.label || `显示器 ${display.id}`,
    bounds: toRectangle(display.bounds),
    workArea: toRectangle(display.workArea),
    scaleFactor: display.scaleFactor
  };
}

function toRectangle(rect: Electron.Rectangle): Rectangle {
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height
  };
}
