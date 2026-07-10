import type { CaptureOwner } from "./captureCoordinator";

interface FrameLike {
  processId: number;
  routingId: number;
}

interface WebContentsLike {
  id: number;
  mainFrame: FrameLike;
}

interface WindowLike {
  isDestroyed(): boolean;
  webContents: WebContentsLike;
}

interface IpcEventLike {
  sender: WebContentsLike;
  senderFrame: FrameLike | null;
}

interface DisplayMediaRequestLike {
  frame: { parent: unknown | null } | null;
  videoRequested: boolean;
  audioRequested: boolean;
}

interface AllowedDisplayMediaRequest extends DisplayMediaRequestLike {
  frame: { parent: null };
  videoRequested: true;
  audioRequested: false;
}

export function assertWindowSender(event: IpcEventLike, window: WindowLike): CaptureOwner {
  if (!isWindowSender(event, window)) {
    throw new Error("IPC 请求来源无效。");
  }

  const frame = event.senderFrame as FrameLike;
  return {
    webContentsId: event.sender.id,
    frame: {
      processId: frame.processId,
      routingId: frame.routingId
    }
  };
}

export function isWindowSender(event: IpcEventLike, window: WindowLike): boolean {
  return !window.isDestroyed() && event.sender === window.webContents && event.senderFrame !== null && event.senderFrame === window.webContents.mainFrame;
}

export function isAllowedDisplayMediaRequest(request: DisplayMediaRequestLike): request is AllowedDisplayMediaRequest {
  return request.frame !== null && request.frame.parent === null && request.videoRequested && !request.audioRequested;
}
