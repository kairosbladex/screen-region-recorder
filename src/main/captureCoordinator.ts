import { randomUUID } from "node:crypto";
import type { CapturePreparation } from "../shared/types";

export interface CaptureFrameIdentity {
  processId: number;
  routingId: number;
}

export interface CaptureOwner {
  webContentsId: number;
  frame: CaptureFrameIdentity;
}

export interface CaptureWindowControl {
  hide(): void;
  restore(): void;
}

export type CapturePhase = "prepared" | "capturing" | "exporting";

export type CaptureSnapshot =
  | { phase: "idle" }
  | {
      phase: CapturePhase;
      sessionId: string;
      displayId: number;
      owner: CaptureOwner;
    };

interface ActiveCapture {
  phase: CapturePhase;
  sessionId: string;
  displayId: number;
  owner: CaptureOwner;
  restoreWindow: () => void;
}

interface FinishedCapture {
  sessionId: string;
  owner: CaptureOwner;
}

interface CaptureCoordinatorOptions {
  createSessionId?: () => string;
}

export class CaptureCoordinator {
  private readonly createSessionId: () => string;
  private active: ActiveCapture | null = null;
  private lastFinished: FinishedCapture | null = null;

  constructor(options: CaptureCoordinatorOptions = {}) {
    this.createSessionId = options.createSessionId ?? randomUUID;
  }

  prepare(owner: CaptureOwner, displayId: number, windowControl: CaptureWindowControl): CapturePreparation {
    if (this.active) {
      throw new Error("已有录制任务正在进行，请等待当前任务完成。");
    }

    const sessionId = this.createSessionId();
    try {
      windowControl.hide();
    } catch (error) {
      try {
        windowControl.restore();
      } catch {
        // Preserve the original window failure while keeping the session idle.
      }
      throw error;
    }
    this.active = {
      phase: "prepared",
      sessionId,
      displayId,
      owner,
      restoreWindow: windowControl.restore
    };
    this.lastFinished = null;
    return { sessionId };
  }

  claimDisplayMedia(frame: CaptureFrameIdentity): { sessionId: string; displayId: number } {
    const active = this.requireActive();
    if (!sameFrame(active.owner.frame, frame)) {
      throw new Error("录制请求来源无效。");
    }
    if (active.phase !== "prepared") {
      throw new Error("录制会话状态无效。");
    }

    active.phase = "capturing";
    return { sessionId: active.sessionId, displayId: active.displayId };
  }

  beginExport(owner: CaptureOwner, sessionId: string): void {
    const active = this.requireOwnedSession(owner, sessionId);
    if (active.phase !== "capturing") {
      throw new Error("录制会话状态无效。");
    }
    active.phase = "exporting";
  }

  finish(owner: CaptureOwner, sessionId: string): void {
    if (!this.active) {
      if (this.lastFinished?.sessionId === sessionId) {
        if (sameOwner(this.lastFinished.owner, owner)) {
          return;
        }
        throw new Error("录制请求来源无效。");
      }
      throw new Error("录制会话无效。");
    }

    this.requireOwnedSession(owner, sessionId);
    this.completeActive();
  }

  abort(sessionId: string): void {
    const active = this.requireActive();
    if (active.sessionId !== sessionId) {
      throw new Error("录制会话无效。");
    }
    this.completeActive();
  }

  abortIfActive(sessionId: string, phase?: CapturePhase): boolean {
    if (!this.active || this.active.sessionId !== sessionId || (phase !== undefined && this.active.phase !== phase)) {
      return false;
    }
    this.completeActive();
    return true;
  }

  isActive(sessionId: string, phase?: CapturePhase): boolean {
    return this.active?.sessionId === sessionId && (phase === undefined || this.active.phase === phase);
  }

  finishOwner(webContentsId: number): boolean {
    if (!this.active || this.active.owner.webContentsId !== webContentsId) {
      return false;
    }

    this.completeActive();
    return true;
  }

  getSnapshot(): CaptureSnapshot {
    if (!this.active) {
      return { phase: "idle" };
    }

    return {
      phase: this.active.phase,
      sessionId: this.active.sessionId,
      displayId: this.active.displayId,
      owner: this.active.owner
    };
  }

  private requireActive(): ActiveCapture {
    if (!this.active) {
      throw new Error("没有可用的录制会话。");
    }
    return this.active;
  }

  private requireOwnedSession(owner: CaptureOwner, sessionId: string): ActiveCapture {
    const active = this.requireActive();
    if (active.sessionId !== sessionId) {
      throw new Error("录制会话无效。");
    }
    if (active.owner.webContentsId !== owner.webContentsId || !sameFrame(active.owner.frame, owner.frame)) {
      throw new Error("录制请求来源无效。");
    }
    return active;
  }

  private completeActive(): void {
    const active = this.requireActive();
    this.active = null;
    this.lastFinished = {
      sessionId: active.sessionId,
      owner: active.owner
    };
    active.restoreWindow();
  }
}

function sameFrame(left: CaptureFrameIdentity, right: CaptureFrameIdentity): boolean {
  return left.processId === right.processId && left.routingId === right.routingId;
}

function sameOwner(left: CaptureOwner, right: CaptureOwner): boolean {
  return left.webContentsId === right.webContentsId && sameFrame(left.frame, right.frame);
}
