import { describe, expect, it } from "vitest";
import {
  buildCaptureRegion,
  calculateCropFromCapturedVideo,
  normalizeCropForVideoCodec,
  translateOverlayRectToDisplayLocal
} from "../src/shared/coordinates";
import type { DisplayInfo } from "../src/shared/types";

describe("coordinate conversion", () => {
  it("converts Retina DIP selection into physical crop without offset", () => {
    const display: DisplayInfo = {
      id: 1,
      label: "Built-in Retina Display",
      bounds: { x: 0, y: 0, width: 1512, height: 982 },
      workArea: { x: 0, y: 0, width: 1512, height: 982 },
      scaleFactor: 2
    };

    const region = buildCaptureRegion(display, { x: 100, y: 50, width: 300, height: 200 });
    const crop = calculateCropFromCapturedVideo(region, { width: 3024, height: 1964 });

    expect(region.bounds).toEqual({ x: 100, y: 50, width: 300, height: 200 });
    expect(region.physicalBounds).toEqual({ x: 200, y: 100, width: 600, height: 400 });
    expect(crop).toEqual({ x: 200, y: 100, width: 600, height: 400 });
  });

  it("keeps selection relative to the chosen display when displays use negative coordinates", () => {
    const display: DisplayInfo = {
      id: 7,
      label: "Left External Display",
      bounds: { x: -1920, y: 0, width: 1920, height: 1080 },
      workArea: { x: -1920, y: 0, width: 1920, height: 1055 },
      scaleFactor: 1
    };

    const region = buildCaptureRegion(display, { x: 120, y: 80, width: 640, height: 360 });
    const crop = calculateCropFromCapturedVideo(region, { width: 1920, height: 1080 });

    expect(region.bounds).toEqual({ x: -1800, y: 80, width: 640, height: 360 });
    expect(crop).toEqual({ x: 120, y: 80, width: 640, height: 360 });
  });

  it("accounts for macOS moving the selection overlay below the menu bar", () => {
    const display: DisplayInfo = {
      id: 1,
      label: "Built-in Retina Display",
      bounds: { x: 0, y: 0, width: 1512, height: 982 },
      workArea: { x: 0, y: 34, width: 1512, height: 889 },
      scaleFactor: 2
    };

    const localRect = translateOverlayRectToDisplayLocal(
      display,
      { x: 0, y: 34, width: 1512, height: 982 },
      { x: 100, y: 50, width: 300, height: 200 }
    );
    const region = buildCaptureRegion(display, localRect);
    const crop = calculateCropFromCapturedVideo(region, { width: 3024, height: 1964 });

    expect(localRect).toEqual({ x: 100, y: 84, width: 300, height: 200 });
    expect(region.bounds).toEqual({ x: 100, y: 84, width: 300, height: 200 });
    expect(crop).toEqual({ x: 200, y: 168, width: 600, height: 400 });
  });

  it("normalizes video crop to even values for MP4/WebM encoders", () => {
    const crop = normalizeCropForVideoCodec({ x: 11, y: 13, width: 301, height: 203 }, { width: 1000, height: 800 });

    expect(crop).toEqual({ x: 10, y: 12, width: 300, height: 202 });
  });
});
