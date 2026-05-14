import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyTheme, resolveTokens } from "./apply.js";
import { DEFAULT_TOKENS } from "./tokens.js";

describe("resolveTokens", () => {
  it("returns the defaults when called with no args", () => {
    expect(resolveTokens()).toEqual(DEFAULT_TOKENS);
  });

  it("layers preset over defaults", () => {
    const tokens = resolveTokens({ preset: "story" });
    expect(tokens["color-bg"]).toBe("transparent");
    expect(tokens["control-size"]).toBe("4.4rem");
    expect(tokens["color-fg"]).toBe(DEFAULT_TOKENS["color-fg"]);
  });

  it("layers overrides over preset", () => {
    const tokens = resolveTokens({
      preset: "story",
      overrides: { "color-accent": "#abcdef" },
    });
    expect(tokens["color-accent"]).toBe("#abcdef");
    expect(tokens["control-size"]).toBe("4.4rem");
  });

  it("skips defaults when applyDefaults=false", () => {
    const tokens = resolveTokens({
      applyDefaults: false,
      overrides: { "color-bg": "#fff" },
    });
    expect(tokens).toEqual({ "color-bg": "#fff" });
  });
});

describe("applyTheme", () => {
  let el: HTMLDivElement;

  beforeEach(() => {
    el = document.createElement("div");
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it("writes CSS custom properties to the element style", () => {
    applyTheme(el, { preset: "admin" });
    expect(el.style.getPropertyValue("--reel-color-bg")).toBe("#1a1d23");
    expect(el.style.getPropertyValue("--reel-color-accent")).toBe("#3ea6ff");
  });

  it("overrides win over the preset", () => {
    applyTheme(el, {
      preset: "admin",
      overrides: { "color-accent": "#fff" },
    });
    expect(el.style.getPropertyValue("--reel-color-accent")).toBe("#fff");
  });

  it("returned disposer reverts to previous values", () => {
    el.style.setProperty("--reel-color-bg", "#000");
    const dispose = applyTheme(el, { preset: "admin" });
    expect(el.style.getPropertyValue("--reel-color-bg")).toBe("#1a1d23");
    dispose();
    expect(el.style.getPropertyValue("--reel-color-bg")).toBe("#000");
  });

  it("disposer removes properties that did not exist before", () => {
    const dispose = applyTheme(el, { overrides: { "color-fg": "#abc" } });
    expect(el.style.getPropertyValue("--reel-color-fg")).toBe("#abc");
    dispose();
    expect(el.style.getPropertyValue("--reel-color-fg")).toBe("");
  });

  it("ignores tokens without a string value", () => {
    expect(() =>
      applyTheme(el, {
        applyDefaults: false,
        // @ts-expect-error — runtime guard test
        overrides: { "color-bg": null },
      }),
    ).not.toThrow();
  });
});
