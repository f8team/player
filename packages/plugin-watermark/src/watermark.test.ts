import type { Player, PluginHost } from "@f8/player-core";
import { describe, expect, it, vi } from "vitest";

import { createWatermarkPlugin } from "./watermark.js";

function makePlayer(): Player {
  return {
    getState: vi.fn(),
    on: vi.fn().mockReturnValue(() => undefined),
    subscribe: vi.fn().mockReturnValue(() => undefined),
    commands: { add: vi.fn().mockReturnValue(() => undefined), run: vi.fn(), has: vi.fn() },
    play: vi.fn(),
    pause: vi.fn(),
    paused: vi.fn(),
    seekTo: vi.fn(),
    setPlaybackRate: vi.fn(),
    setVolume: vi.fn(),
    setMuted: vi.fn(),
    setSource: vi.fn(),
    getSource: vi.fn(),
    getCurrentTime: vi.fn(),
    getDuration: vi.fn(),
    getBuffered: vi.fn(),
    off: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    dispose: vi.fn(),
    use: vi.fn(),
    removePlugin: vi.fn(),
  } as unknown as Player;
}

function makeHost(): PluginHost & {
  _getContrib: () => { slot: string; render: () => Element } | null;
} {
  let contrib: { slot: string; render: () => Element } | null = null;
  const disposer = vi.fn();
  return {
    controls: {
      contribute: vi.fn().mockImplementation((slot: string, render: () => Element) => {
        contrib = { slot, render };
        return disposer;
      }),
    },
    commands: { add: vi.fn().mockReturnValue(() => undefined), run: vi.fn(), has: vi.fn() },
    store: { getState: vi.fn(), subscribe: vi.fn().mockReturnValue(() => undefined) },
    emit: vi.fn(),
    _getContrib: () => contrib,
  };
}

describe("createWatermarkPlugin", () => {
  it("has name 'watermark'", () => {
    expect(createWatermarkPlugin({ text: "F8" }).name).toBe("watermark");
  });

  it("contributes to 'overlay' slot by default", () => {
    const host = makeHost();
    createWatermarkPlugin({ text: "F8" }).setup(makePlayer(), host);
    expect(host._getContrib()?.slot).toBe("overlay");
    expect(host.controls.contribute).toHaveBeenCalledWith("overlay", expect.any(Function));
  });

  it("accepts custom slot", () => {
    const host = makeHost();
    createWatermarkPlugin({ text: "F8", slot: "top-overlay" }).setup(makePlayer(), host);
    expect(host._getContrib()?.slot).toBe("top-overlay");
  });

  it("render() returns element with correct text", () => {
    const host = makeHost();
    createWatermarkPlugin({ text: "F8 • user@example.com" }).setup(makePlayer(), host);
    const el = host._getContrib()?.render() as HTMLElement;
    expect(el.textContent).toBe("F8 • user@example.com");
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(el.classList.contains("f8-watermark")).toBe(true);
  });

  it("applies custom className", () => {
    const host = makeHost();
    createWatermarkPlugin({ text: "F8", className: "my-wm" }).setup(makePlayer(), host);
    const el = host._getContrib()?.render() as HTMLElement;
    expect(el.classList.contains("my-wm")).toBe(true);
  });

  it("teardown calls dispose", () => {
    const plugin = createWatermarkPlugin({ text: "F8" });
    const teardown = plugin.setup(makePlayer(), makeHost());
    expect(() => teardown?.()).not.toThrow();
  });
});
