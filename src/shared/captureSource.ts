export interface CaptureSourceLike {
  id: string;
  display_id?: string;
}

export interface CaptureSourcePickOptions {
  displayCount: number;
}

/**
 * Pick a desktopCapturer screen source for a chosen display.
 * Prefers exact `display_id` match. Empty/missing display_id fallback is only
 * allowed when the OS reports a single display, so multi-display captures never
 * silently map an unknown source to the selected display.
 */
export function pickCaptureSourceByDisplayId<T extends CaptureSourceLike>(
  sources: T[],
  displayId: number,
  options: CaptureSourcePickOptions
): T | null {
  const target = String(displayId);
  const exact = sources.find((source) => source.display_id === target);
  if (exact) {
    return exact;
  }

  if (options.displayCount === 1 && sources.length === 1) {
    const only = sources[0];
    if (!only.display_id) {
      return only;
    }
  }

  return null;
}
