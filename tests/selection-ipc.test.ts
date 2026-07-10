import { beforeEach, describe, expect, it, vi } from "vitest";

const electron = vi.hoisted(() => {
  const handlers = new Map<string, (event: unknown, payload?: unknown) => void>();
  const windows: FakeWindow[] = [];
  let nextId = 1;

  class FakeWindow {
    destroyed = false;
    closedListener: (() => void) | null = null;
    readonly webContents: {
      id: number;
      mainFrame: { processId: number; routingId: number };
      setWindowOpenHandler: () => void;
      on: () => void;
    };

    constructor(readonly options: { x: number; y: number; width: number; height: number }) {
      const id = nextId++;
      this.webContents = {
        id,
        mainFrame: { processId: 100 + id, routingId: 200 + id },
        setWindowOpenHandler: () => undefined,
        on: () => undefined
      };
      windows.push(this);
    }

    getBounds() {
      return { x: this.options.x, y: this.options.y, width: this.options.width, height: this.options.height };
    }

    isDestroyed(): boolean {
      return this.destroyed;
    }

    close(): void {
      this.destroyed = true;
      this.closedListener?.();
    }

    once(event: string, listener: () => void): void {
      if (event === "closed") {
        this.closedListener = listener;
      }
    }

    setAlwaysOnTop(): void {}
    setVisibleOnAllWorkspaces(): void {}
    focus(): void {}
    async loadFile(): Promise<void> {}
    async loadURL(): Promise<void> {}
  }

  return {
    handlers,
    windows,
    reset: () => {
      handlers.clear();
      windows.length = 0;
      nextId = 1;
    },
    BrowserWindow: FakeWindow,
    ipcMain: {
      on: (channel: string, handler: (event: unknown, payload?: unknown) => void) => handlers.set(channel, handler)
    },
    screen: {
      getAllDisplays: () => [
        {
          id: 7,
          label: "Test Display",
          bounds: { x: 0, y: 0, width: 1280, height: 720 },
          workArea: { x: 0, y: 24, width: 1280, height: 696 },
          scaleFactor: 2
        }
      ]
    }
  };
});

vi.mock("electron", () => ({
  BrowserWindow: electron.BrowserWindow,
  ipcMain: electron.ipcMain,
  screen: electron.screen
}));

vi.mock("@electron-toolkit/utils", () => ({ is: { dev: false } }));

beforeEach(() => {
  electron.reset();
  vi.resetModules();
});

describe("selection IPC", () => {
  it("ignores malformed or foreign messages and derives display identity from the active overlay", async () => {
    const { cancelActiveSelection, registerSelectionIpc, selectRegion } = await import("../src/main/selection");
    registerSelectionIpc();

    const selection = selectRegion();
    const overlay = electron.windows[0];
    const complete = electron.handlers.get("screenclip:selection-complete");
    const event = { sender: overlay.webContents, senderFrame: overlay.webContents.mainFrame };

    complete?.(event, { x: Number.NaN, y: 20, width: 300, height: 200 });
    expect(overlay.isDestroyed()).toBe(false);

    const foreignFrame = { processId: 999, routingId: 999 };
    complete?.({ sender: { id: 999, mainFrame: foreignFrame }, senderFrame: foreignFrame }, { x: 10, y: 20, width: 300, height: 200 });
    expect(overlay.isDestroyed()).toBe(false);

    complete?.(event, { x: 10, y: 20, width: 300, height: 200 });
    await expect(selection).resolves.toMatchObject({ ok: true, region: { displayId: 7 } });

    const cancelledSelection = selectRegion();
    cancelActiveSelection();
    await expect(cancelledSelection).resolves.toMatchObject({ ok: false, cancelled: true });
  });
});
