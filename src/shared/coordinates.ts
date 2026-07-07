import type { CaptureRegion, CropRectangle, DisplayInfo, Rectangle, VideoSize } from "./types";

const MIN_REGION_SIZE = 8;

export function normalizeRectangle(start: Pick<Rectangle, "x" | "y">, end: Pick<Rectangle, "x" | "y">): Rectangle {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return { x, y, width, height };
}

export function hasUsableSelection(rect: Rectangle): boolean {
  return rect.width >= MIN_REGION_SIZE && rect.height >= MIN_REGION_SIZE;
}

export function translateOverlayRectToDisplayLocal(display: DisplayInfo, overlayBounds: Rectangle, overlayRect: Rectangle): Rectangle {
  return {
    x: overlayBounds.x - display.bounds.x + overlayRect.x,
    y: overlayBounds.y - display.bounds.y + overlayRect.y,
    width: overlayRect.width,
    height: overlayRect.height
  };
}

export function buildCaptureRegion(display: DisplayInfo, localRect: Rectangle): CaptureRegion {
  const clampedLocal = clampRect(localRect, {
    x: 0,
    y: 0,
    width: display.bounds.width,
    height: display.bounds.height
  });

  const bounds = {
    x: display.bounds.x + clampedLocal.x,
    y: display.bounds.y + clampedLocal.y,
    width: clampedLocal.width,
    height: clampedLocal.height
  };

  return {
    displayId: display.id,
    displayLabel: display.label,
    displayBounds: display.bounds,
    displayScaleFactor: display.scaleFactor,
    bounds,
    physicalBounds: {
      x: Math.round(clampedLocal.x * display.scaleFactor),
      y: Math.round(clampedLocal.y * display.scaleFactor),
      width: Math.round(clampedLocal.width * display.scaleFactor),
      height: Math.round(clampedLocal.height * display.scaleFactor)
    }
  };
}

export function calculateCropFromCapturedVideo(region: CaptureRegion, capturedSize: VideoSize): CropRectangle {
  const relativeX = region.bounds.x - region.displayBounds.x;
  const relativeY = region.bounds.y - region.displayBounds.y;
  const ratioX = capturedSize.width / region.displayBounds.width;
  const ratioY = capturedSize.height / region.displayBounds.height;

  return clampRect(
    {
      x: Math.round(relativeX * ratioX),
      y: Math.round(relativeY * ratioY),
      width: Math.round(region.bounds.width * ratioX),
      height: Math.round(region.bounds.height * ratioY)
    },
    {
      x: 0,
      y: 0,
      width: capturedSize.width,
      height: capturedSize.height
    }
  );
}

export function normalizeCropForVideoCodec(crop: CropRectangle, capturedSize: VideoSize): CropRectangle {
  const evenX = Math.max(0, Math.floor(crop.x / 2) * 2);
  const evenY = Math.max(0, Math.floor(crop.y / 2) * 2);
  const evenWidth = Math.max(2, Math.floor(crop.width / 2) * 2);
  const evenHeight = Math.max(2, Math.floor(crop.height / 2) * 2);
  const safeWidth = Math.min(evenWidth, Math.max(2, Math.floor((capturedSize.width - evenX) / 2) * 2));
  const safeHeight = Math.min(evenHeight, Math.max(2, Math.floor((capturedSize.height - evenY) / 2) * 2));

  return {
    x: evenX,
    y: evenY,
    width: safeWidth,
    height: safeHeight
  };
}

export function formatRegionLabel(region: CaptureRegion | null): string {
  if (!region) {
    return "未选择区域";
  }

  const { bounds, physicalBounds } = region;
  return `${region.displayLabel} · ${Math.round(bounds.width)}x${Math.round(bounds.height)} DIP · ${physicalBounds.width}x${physicalBounds.height}px`;
}

function clampRect(rect: Rectangle, bounds: Rectangle): Rectangle {
  const x = clamp(rect.x, bounds.x, bounds.x + bounds.width);
  const y = clamp(rect.y, bounds.y, bounds.y + bounds.height);
  const width = clamp(rect.width, 0, bounds.x + bounds.width - x);
  const height = clamp(rect.height, 0, bounds.y + bounds.height - y);

  return { x, y, width, height };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
