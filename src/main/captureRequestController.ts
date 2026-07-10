import { assertExportRecordingRequest } from "../shared/exportRequest";
import type { ExportRecordingRequest, ExportRecordingResult } from "../shared/types";
import type { CaptureCoordinator, CaptureOwner } from "./captureCoordinator";

interface CaptureRequestControllerDependencies {
  coordinator: CaptureCoordinator;
  exportRecording(request: ExportRecordingRequest): Promise<ExportRecordingResult>;
}

export class CaptureRequestController {
  private readonly coordinator: CaptureCoordinator;
  private readonly exportRecording: (request: ExportRecordingRequest) => Promise<ExportRecordingResult>;

  constructor({ coordinator, exportRecording }: CaptureRequestControllerDependencies) {
    this.coordinator = coordinator;
    this.exportRecording = exportRecording;
  }

  finish(owner: CaptureOwner, sessionId: unknown): void {
    this.coordinator.finish(owner, assertSessionId(sessionId));
  }

  async export(owner: CaptureOwner, request: unknown): Promise<ExportRecordingResult> {
    const exportRequest = assertExportRecordingRequest(request);
    this.coordinator.beginExport(owner, exportRequest.sessionId);
    try {
      return await this.exportRecording(exportRequest);
    } finally {
      this.coordinator.finish(owner, exportRequest.sessionId);
    }
  }
}

function assertSessionId(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("录制会话无效。");
  }
  return value;
}
