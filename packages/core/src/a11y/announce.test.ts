import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { _disposeAnnounce, announce } from "./announce.js";

describe("announce", () => {
  beforeEach(() => {
    _disposeAnnounce();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    _disposeAnnounce();
  });

  it("creates a single off-screen live region on first call", async () => {
    announce("Hello");
    await Promise.resolve();
    const region = document.getElementById("f8-player-live-region");
    expect(region).toBeTruthy();
    expect(region?.getAttribute("aria-live")).toBe("polite");
    expect(region?.getAttribute("role")).toBe("status");
    expect(region?.textContent).toBe("Hello");
  });

  it("reuses the same region on subsequent calls", async () => {
    announce("a");
    await Promise.resolve();
    const first = document.getElementById("f8-player-live-region");
    announce("b");
    await Promise.resolve();
    const second = document.getElementById("f8-player-live-region");
    expect(first).toBe(second);
    expect(second?.textContent).toBe("b");
  });

  it("re-announces the same string by blanking and re-setting", async () => {
    announce("Same");
    await Promise.resolve();
    const region = document.getElementById("f8-player-live-region");
    expect(region?.textContent).toBe("Same");
    announce("Same");
    expect(region?.textContent).toBe("");
    await Promise.resolve();
    expect(region?.textContent).toBe("Same");
  });

  it("ignores empty strings", async () => {
    announce("");
    await Promise.resolve();
    expect(document.getElementById("f8-player-live-region")).toBeNull();
  });

  it("recovers if the region was removed externally", async () => {
    announce("a");
    await Promise.resolve();
    document.getElementById("f8-player-live-region")?.remove();
    announce("b");
    await Promise.resolve();
    const region = document.getElementById("f8-player-live-region");
    expect(region?.textContent).toBe("b");
  });
});
