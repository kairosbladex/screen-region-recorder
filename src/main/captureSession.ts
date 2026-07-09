/**
 * Tracks which display is prepared for the next getDisplayMedia request.
 * Must be cleared after capture ends or fails, otherwise a later request
 * can still route to a stale display id.
 */
export class CaptureSession {
  private activeDisplayId: number | null = null;

  prepare(displayId: number): void {
    this.activeDisplayId = displayId;
  }

  getActiveDisplayId(): number | null {
    return this.activeDisplayId;
  }

  finish(): void {
    this.activeDisplayId = null;
  }
}
