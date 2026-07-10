import { contextBridge, ipcRenderer } from "electron";
import type { Rectangle } from "../shared/types";

const api = {
  completeSelection: (rect: Rectangle): void => {
    ipcRenderer.send("screenclip:selection-complete", rect);
  },
  cancelSelection: (): void => {
    ipcRenderer.send("screenclip:selection-cancel");
  }
};

contextBridge.exposeInMainWorld("selectionClip", api);

export type SelectionWindowApi = typeof api;
