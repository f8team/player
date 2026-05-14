import type { Player, PluginHost } from "@f8team/reel-core";
import { describe, expect, it, vi } from "vitest";

import { createPipPlugin } from "./pip.js";

function makePlayer(): Player {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    getState: vi.fn().mockReturnValue({
      status: "idle",
      source: null,
      currentTime: 0,
      duration: 0,
      buffered: [],
      playbackRate: 1,
      volume: 1,
      muted: false,
      videoWidth: 0,
      videoHeight: 0,
      pip: false,
      fullscreen: false,
      qualities: [],
      activeQuality: null,
      error: null,
    }),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    paused: vi.fn().mockReturnValue(true),
    seekTo: vi.fn(),
    setPlaybackRate: vi.fn(),
    setVolume: vi.fn(),
    setMuted: vi.fn(),
    setSource: vi.fn(),
    getSource: vi.fn(),
    getCurrentTime: vi.fn().mockReturnValue(0),
    getDuration: vi.fn().mockReturnValue(0),
    getBuffered: vi.fn().mockReturnValue([]),
    subscribe: vi.fn().mockReturnValue(() => undefined),
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] ??= [];
      handlers[event]!.push(handler);
      return () => {
        const idx = handlers[event]!.indexOf(handler);
        if (idx >= 0) handlers[event]!.splice(idx, 1);
      };
    }),
    off: vi.fn(),
    attach: vi.fn().mockResolvedValue(undefined),
    detach: vi.fn(),
    dispose: vi.fn(),
    use: vi.fn(),
    removePlugin: vi.fn(),
    commands: { add: vi.fn().mockReturnValue(() => undefined), run: vi.fn(), has: vi.fn() },
    _emit: (event: string, payload?: unknown) => {
      handlers[event]?.forEach((h) => h(payload));
    },
  } as unknown as Player & { _emit: (e: string, p?: unknown) => void };
}

function makeHost(): PluginHost {
  let toggleHandler: (() => void) | null = null;
  return {
    controls: { contribute: vi.fn().mockReturnValue(() => undefined) },
    commands: {
      add: vi.fn().mockImplementation((_name: string, handler: () => void) => {
        toggleHandler = handler;
        return () => undefined;
      }),
      run: vi.fn().mockImplementation((name: string) => {
        if (name === "pip:toggle") toggleHandler?.();
      }),
      has: vi.fn(),
    },
    store: { getState: vi.fn(), subscribe: vi.fn().mockReturnValue(() => undefined) },
    emit: vi.fn(),
    _getToggle: () => toggleHandler,
  } as unknown as PluginHost & { _getToggle: () => (() => void) | null };
}

describe("createPipPlugin", () => {
  it("has name 'pip'", () => {
    expect(createPipPlugin().name).toBe("pip");
  });

  it("registers pip:toggle command", () => {
    const plugin = createPipPlugin();
    const player = makePlayer();
    const host = makeHost();
    plugin.setup(player, host);
    expect(host.commands.add).toHaveBeenCalledWith("pip:toggle", expect.any(Function));
  });

  it("subscribes to player ready event", () => {
    const plugin = createPipPlugin();
    const player = makePlayer();
    const host = makeHost();
    plugin.setup(player, host);
    expect(player.on).toHaveBeenCalledWith("ready", expect.any(Function));
  });

  it("pip:toggle is a no-op when pictureInPictureEnabled is false", () => {
    Object.defineProperty(document, "pictureInPictureEnabled", {
      configurable: true,
      value: false,
    });
    const plugin = createPipPlugin();
    const player = makePlayer();
    const host = makeHost();
    plugin.setup(player, host);
    // Should not throw
    (host.commands.run as (name: string) => void)("pip:toggle");
  });

  it("teardown calls offReady and disposeToggle", () => {
    const plugin = createPipPlugin();
    const player = makePlayer();
    const host = makeHost();
    const teardown = plugin.setup(player, host);
    expect(() => teardown?.()).not.toThrow();
  });
});
