import { isAbsolute, relative, resolve } from "node:path";

/**
 * Returns true only when `filePath` resolves to a file strictly inside `directory`
 * (not the directory itself, not a path that escapes via `..`).
 */
export function isPathInsideDirectory(filePath: string, directory: string): boolean {
  const resolvedFile = resolve(filePath);
  const resolvedDir = resolve(directory);
  const rel = relative(resolvedDir, resolvedFile);

  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}
