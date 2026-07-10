import type { DesktopCapturerSource } from "electron";
import type { CaptureCoordinator } from "./captureCoordinator";
import { isAllowedDisplayMediaRequest } from "./ipcSecurity";

interface DisplayMediaHandlerDependencies {
  coordinator: CaptureCoordinator;
  getSourceForDisplay(displayId: number): Promise<DesktopCapturerSource | null>;
}

type DisplayMediaCallback = (streams: { video?: DesktopCapturerSource }) => void;

export function createDisplayMediaRequestHandler({ coordinator, getSourceForDisplay }: DisplayMediaHandlerDependencies) {
  return async (request: Electron.DisplayMediaRequestHandlerHandlerRequest, callback: DisplayMediaCallback): Promise<void> => {
    if (!isAllowedDisplayMediaRequest(request)) {
      callback({});
      return;
    }

    let claimedSession: { sessionId: string; displayId: number };
    try {
      claimedSession = coordinator.claimDisplayMedia({
        processId: request.frame.processId,
        routingId: request.frame.routingId
      });
    } catch {
      callback({});
      return;
    }

    try {
      const source = await getSourceForDisplay(claimedSession.displayId);
      if (!source || !coordinator.isActive(claimedSession.sessionId, "capturing")) {
        coordinator.abortIfActive(claimedSession.sessionId, "capturing");
        callback({});
        return;
      }
      callback({ video: source });
    } catch {
      coordinator.abortIfActive(claimedSession.sessionId, "capturing");
      callback({});
    }
  };
}
