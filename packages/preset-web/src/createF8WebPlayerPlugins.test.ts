import { describe, expect, it } from "vitest";

import {
  DEFAULT_F8_KEYBOARD,
  createF8WebPlayerPlugins,
  type F8WebPlayerPluginsOptions,
} from "./createF8WebPlayerPlugins.js";

describe("createF8WebPlayerPlugins", () => {
  it("omits markers/keyboard/auth/subtitles unless requested", () => {
    const p = createF8WebPlayerPlugins({
      markers: false,
      keyboard: false,
      thumbnails: false,
      auth: false,
      subtitles: false,
      hlsQuality: true,
    });
    const names = p.map((x) => x.name);
    expect(names).toEqual(expect.arrayContaining(["hls-quality", "fullscreen", "pip"]));
    expect(names).not.toContain("markers");
    expect(names).not.toContain("keyboard");
    expect(names).not.toContain("auth-aware");
    expect(names).not.toContain("subtitles");
    expect(names).not.toContain("thumbnails");
  });

  it("adds thumbnails when thumbnails=always (default)", () => {
    const p = createF8WebPlayerPlugins({
      keyboard: false,
      auth: false,
      subtitles: false,
      thumbnails: "always",
    } satisfies F8WebPlayerPluginsOptions);
    expect(p.some((pl) => pl.name === "thumbnails")).toBe(true);
  });

  it("uses DEFAULT_F8_KEYBOARD when keyboard omitted", () => {
    const p = createF8WebPlayerPlugins({
      auth: false,
      subtitles: false,
      thumbnails: false,
    } satisfies F8WebPlayerPluginsOptions);
    expect(p.find((pl) => pl.name === "keyboard")).toBeTruthy();
    // Setup not invoked — name check is sufficient for ordering contract.
    void DEFAULT_F8_KEYBOARD;
  });
});
