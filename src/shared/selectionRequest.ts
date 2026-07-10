import type { Rectangle } from "./types";

export function assertSelectionRectangle(value: unknown): Rectangle {
  if (!isRecord(value)) {
    throw new Error("框选区域无效。");
  }

  if (!isFiniteNumber(value.x) || !isFiniteNumber(value.y) || !isPositiveNumber(value.width) || !isPositiveNumber(value.height)) {
    throw new Error("框选区域无效。");
  }

  return value as unknown as Rectangle;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositiveNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
