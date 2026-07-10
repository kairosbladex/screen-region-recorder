import { describe, expect, it } from "vitest";
import { canAttemptScreenCapture } from "../src/main/permissions";

describe("screen capture permission", () => {
  it("allows a real capture attempt to trigger first-run macOS consent", () => {
    expect(canAttemptScreenCapture("not-determined")).toBe(true);
    expect(canAttemptScreenCapture("unknown")).toBe(true);
    expect(canAttemptScreenCapture("granted")).toBe(true);
  });

  it("blocks statuses that require the user to change system settings", () => {
    expect(canAttemptScreenCapture("denied")).toBe(false);
    expect(canAttemptScreenCapture("restricted")).toBe(false);
  });
});
