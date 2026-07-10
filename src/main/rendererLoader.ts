import type { BrowserWindow } from "electron";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export type RendererQuery = Record<string, string>;

const assetPathPattern = /\.(?:js|mjs|cjs|css|map|json|wasm|png|jpe?g|gif|svg|webp)$/i;

export function createRendererUrl(
  rawUrl: string | undefined,
  query: RendererQuery,
  allowDevServer: boolean
): string | null {
  if (!allowDevServer || !rawUrl) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  if (assetPathPattern.test(url.pathname)) {
    return null;
  }

  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

export function getRendererIndexPath(): string {
  return join(__dirname, "../renderer/index.html");
}

export function getRendererEntryUrl(query: RendererQuery, allowDevServer: boolean): string {
  const rendererUrl = createRendererUrl(process.env.ELECTRON_RENDERER_URL, query, allowDevServer);
  if (rendererUrl) {
    return rendererUrl;
  }

  const fileUrl = pathToFileURL(getRendererIndexPath());
  for (const [key, value] of Object.entries(query)) {
    fileUrl.searchParams.set(key, value);
  }
  return fileUrl.toString();
}

export function loadRenderer(
  window: Pick<BrowserWindow, "loadFile" | "loadURL">,
  query: RendererQuery,
  allowDevServer: boolean
): Promise<void> {
  const rendererUrl = createRendererUrl(process.env.ELECTRON_RENDERER_URL, query, allowDevServer);
  if (rendererUrl) {
    return window.loadURL(rendererUrl);
  }

  return window.loadFile(getRendererIndexPath(), { query });
}
