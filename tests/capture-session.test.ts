import { describe, expect, it } from "vitest";
import { CaptureSession } from "../src/main/captureSession";

describe("CaptureSession", () => {
  it("arms a display id for the next capture and clears it on finish", () => {
    const session = new CaptureSession();

    expect(session.getActiveDisplayId()).toBeNull();

    session.prepare(42);
    expect(session.getActiveDisplayId()).toBe(42);

    session.finish();
    expect(session.getActiveDisplayId()).toBeNull();
  });

  it("allows finish to be called repeatedly without throwing", () => {
    const session = new CaptureSession();
    session.prepare(7);
    session.finish();
    session.finish();
    expect(session.getActiveDisplayId()).toBeNull();
  });

  it("replaces a previous prepared display when prepare is called again", () => {
    const session = new CaptureSession();
    session.prepare(1);
    session.prepare(2);
    expect(session.getActiveDisplayId()).toBe(2);
  });
});
