import type { ScreenClipApi } from "../preload";

declare global {
  interface Window {
    screenClip: ScreenClipApi;
  }
}

export {};
