import { describe, expect, it } from "vitest";
import { assertExportRecordingRequest } from "../src/shared/exportRequest";
import type { ExportRecordingRequest } from "../src/shared/types";

describe("assertExportRecordingRequest", () => {
  it("accepts a valid export request", () => {
    const request = createRequest();

    expect(assertExportRecordingRequest(request)).toBe(request);
  });

  it("rejects invalid export data, format and duration", () => {
    const request = createRequest();

    expect(() => assertExportRecordingRequest({ ...request, data: new Uint8Array([1, 2]) })).toThrow("导出数据无效");
    expect(() => assertExportRecordingRequest({ ...request, format: "../mp4" })).toThrow("导出格式无效");
    expect(() => assertExportRecordingRequest({ ...request, durationSeconds: 0 })).toThrow("录制时长无效");
    expect(() => assertExportRecordingRequest({ ...request, sessionId: "" })).toThrow("录制会话无效");
  });

  it("rejects invalid capture region geometry", () => {
    const request = createRequest();

    expect(() =>
      assertExportRecordingRequest({
        ...request,
        region: {
          ...request.region,
          displayId: 1.5
        }
      })
    ).toThrow("录制区域显示器 ID 无效");

    expect(() =>
      assertExportRecordingRequest({
        ...request,
        region: {
          ...request.region,
          bounds: { ...request.region.bounds, width: 0 }
        }
      })
    ).toThrow("录制区域边界宽度无效");
  });

  it("rejects invalid captured video size", () => {
    const request = createRequest();

    expect(() =>
      assertExportRecordingRequest({
        ...request,
        capturedSize: { ...request.capturedSize, height: Number.NaN }
      })
    ).toThrow("捕获视频高度无效");
  });
});

function createRequest(): ExportRecordingRequest {
  return {
    sessionId: "session-1",
    data: new ArrayBuffer(3),
    format: "mp4",
    durationSeconds: 3,
    region: {
      displayId: 1,
      displayLabel: "Built-in Display",
      displayBounds: { x: 0, y: 0, width: 1512, height: 982 },
      displayScaleFactor: 2,
      bounds: { x: 100, y: 120, width: 300, height: 200 },
      physicalBounds: { x: 200, y: 240, width: 600, height: 400 }
    },
    capturedSize: { width: 3024, height: 1964 }
  };
}
