import type { MainWindowApi } from "../preload/app";
import type { SelectionWindowApi } from "../preload/selection";

declare global {
  interface Window {
    screenClip: MainWindowApi;
    selectionClip: SelectionWindowApi;
  }
}

export {};
