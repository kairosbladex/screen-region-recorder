import { describe, expect, it } from "vitest";
import { assertWindowSender, isAllowedDisplayMediaRequest, isWindowSender } from "../src/main/ipcSecurity";

describe("IPC sender security", () => {
  it("accepts only the expected window main frame", () => {
    const frame = { processId: 21, routingId: 31 };
    const webContents = { id: 11, mainFrame: frame };
    const window = { isDestroyed: () => false, webContents };
    const event = { sender: webContents, senderFrame: frame };

    expect(assertWindowSender(event, window)).toEqual({
      webContentsId: 11,
      frame: { processId: 21, routingId: 31 }
    });
    expect(isWindowSender(event, window)).toBe(true);
  });

  it("rejects another window, a subframe, a missing frame and a destroyed window", () => {
    const frame = { processId: 21, routingId: 31 };
    const webContents = { id: 11, mainFrame: frame };
    const window = { isDestroyed: () => false, webContents };

    expect(isWindowSender({ sender: { id: 12, mainFrame: frame }, senderFrame: frame }, window)).toBe(false);
    expect(isWindowSender({ sender: webContents, senderFrame: { processId: 21, routingId: 99 } }, window)).toBe(false);
    expect(isWindowSender({ sender: webContents, senderFrame: null }, window)).toBe(false);
    expect(isWindowSender({ sender: webContents, senderFrame: frame }, { ...window, isDestroyed: () => true })).toBe(false);
    expect(() => assertWindowSender({ sender: webContents, senderFrame: null }, window)).toThrow("IPC 请求来源无效");
  });

  it("allows only top-frame video-only display media requests", () => {
    expect(isAllowedDisplayMediaRequest({ frame: { parent: null }, videoRequested: true, audioRequested: false })).toBe(true);
    expect(isAllowedDisplayMediaRequest({ frame: { parent: {} }, videoRequested: true, audioRequested: false })).toBe(false);
    expect(isAllowedDisplayMediaRequest({ frame: null, videoRequested: true, audioRequested: false })).toBe(false);
    expect(isAllowedDisplayMediaRequest({ frame: { parent: null }, videoRequested: true, audioRequested: true })).toBe(false);
    expect(isAllowedDisplayMediaRequest({ frame: { parent: null }, videoRequested: false, audioRequested: false })).toBe(false);
  });
});
