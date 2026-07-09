import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isPathInsideDirectory } from "../src/shared/pathSafety";

describe("isPathInsideDirectory", () => {
  const outputDir = join("/tmp", "Downloads", "ScreenClips");

  it("accepts files directly under the output directory", () => {
    expect(isPathInsideDirectory(join(outputDir, "clip.gif"), outputDir)).toBe(true);
  });

  it("rejects paths that escape via parent segments", () => {
    expect(isPathInsideDirectory(join(outputDir, "..", "secret.txt"), outputDir)).toBe(false);
  });

  it("rejects the directory itself and unrelated absolute paths", () => {
    expect(isPathInsideDirectory(outputDir, outputDir)).toBe(false);
    expect(isPathInsideDirectory("/etc/passwd", outputDir)).toBe(false);
  });
});
