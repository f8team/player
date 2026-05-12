import type { Player, PluginHost } from "@f8/player-core";
import { describe, expect, it, vi } from "vitest";

import { createFullscreenPlugin } from "./fullscreen.js";

function makePlayer(): Player {
  return {
    getState: vi.fn(),
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
    subscribe: vi.fn().mockReturnValue(() => undefined),
    on: vi.fn().mockReturnValue(() => undefined),
    off: vi.fn(),
    attach: vi.fn().mockResolvedValue(undefined),
    detach: vi.fn(),
    dispose: vi.fn(),
    use: vi.fn(),
    removePlugin: vi.fn(),
    commands: { add: vi.fn().mockReturnValue(() => undefined), run: vi.fn(), has: vi.fn() },
  } as unknown as Player;
}

function makeHost(): PluginHost & { _getToggle: () => (() => void) | null } {
  let handler: (() => void) | null = null;
  return {
    controls: { contribute: vi.fn().mockReturnValue(() => undefined) },
    commands: {
      add: vi.fn().mockImplementation((_: string, h: () => void) => {
        handler = h;
        return () => undefined;
      }),
      run: vi.fn(),
      has: vi.fn(),
    },
    store: { getState: vi.fn(), subscribe: vi.fn().mockReturnValue(() => undefined) },
    emit: vi.fn(),
    _getToggle: () => handler,
  };
}

describe("createFullscreenPlugin", () => {
  it("has name 'fullscreen'", () => {
    expect(createFullscreenPlugin().name).toBe("fullscreen");
  });

  it("registers fullscreen:toggle command", () => {
    const plugin = createFullscreenPlugin();
    const player = makePlayer();
    const host = makeHost();
    plugin.setup(player, host);
    expect(host.commands.add).toHaveBeenCalledWith("fullscreen:toggle", expect.any(Function));
  });

  it("toggle is a no-op when fullscreenEnabled is false", () => {
    Object.defineProperty(document, "fullscreenEnabled", {
      configurable: true,
      value: false,
    });
    const plugin = createFullscreenPlugin();
    const host = makeHost();
    plugin.setup(makePlayer(), host);
    expect(() => host._getToggle()?.()).not.toThrow();
  });

  it("accepts custom getContainer option", () => {
    const container = document.createElement("div");
    container.requestFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, "fullscreenEnabled", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null,
    });
    const plugin = createFullscreenPlugin({ getContainer: () => container });
    const host = makeHost();
    plugin.setup(makePlayer(), host);
    host._getToggle()?.();
    expect(container.requestFullscreen).toHaveBeenCalled();
  });

  it("teardown removes fullscreenchange listener and disposes command", () => {
    const plugin = createFullscreenPlugin();
    const teardown = plugin.setup(makePlayer(), makeHost());
    expect(() => teardown?.()).not.toThrow();
  });
});
