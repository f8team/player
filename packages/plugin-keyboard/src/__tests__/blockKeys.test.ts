/**
 * Granular `blockKeys` option on `createKeyboardPlugin` — Phase 3 (T3.3).
 *
 * Replaces the consumer-side `KeyboardHandler` (f8-ui) that was needed to
 * block Space while keeping arrow seek active.
 */
import type { Player, PluginHost, PlayerState } from "@f8/player-core";
import { describe, expect, it, vi } from "vitest";

import { createKeyboardPlugin } from "../keyboard.js";

function makeState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    status: "idle",
    source: null,
    currentTime: 30,
    duration: 100,
    buffered: [],
    playbackRate: 1,
    volume: 0.8,
    muted: false,
    videoWidth: 0,
    videoHeight: 0,
    pip: false,
    fullscreen: false,
    qualities: [],
    activeQuality: null,
    error: null,
    ...overrides,
  };
}

function makePlayer(state = makeState()): Player {
  return {
    getState: () => state,
    getSource: vi.fn().mockReturnValue(null),
    getCurrentTime: () => state.currentTime,
    getDuration: () => state.duration,
    getBuffered: () => [],
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    paused: vi.fn().mockReturnValue(true),
    seekTo: vi.fn(),
    setPlaybackRate: vi.fn(),
    setVolume: vi.fn(),
    setMuted: vi.fn(),
    setSource: vi.fn(),
    subscribe: vi.fn().mockReturnValue(() => undefined),
    on: vi.fn().mockReturnValue(() => undefined),
    off: vi.fn(),
    attach: vi.fn().mockResolvedValue(undefined),
    detach: vi.fn(),
    dispose: vi.fn(),
    use: vi.fn(),
    removePlugin: vi.fn(),
    commands: {
      add: vi.fn().mockReturnValue(() => undefined),
      run: vi.fn(),
      has: vi.fn().mockReturnValue(false),
    },
  } as unknown as Player;
}

type CommandHandler = (...args: unknown[]) => void;

function makeCapturingHost(): { host: PluginHost; commands: Map<string, CommandHandler> } {
  const commands = new Map<string, CommandHandler>();
  const host = {
    controls: { contribute: vi.fn().mockReturnValue(() => undefined) },
    commands: {
      add: vi.fn((name: string, fn: CommandHandler) => {
        commands.set(name, fn);
        return () => commands.delete(name);
      }),
      run: vi.fn(),
      has: vi.fn().mockReturnValue(false),
    },
    store: {
      getState: vi.fn(),
      subscribe: vi.fn().mockReturnValue(() => undefined),
    },
    emit: vi.fn(),
  } as unknown as PluginHost;
  return { host, commands };
}

function key(code: string, opts: Partial<KeyboardEventInit> = {}): KeyboardEvent {
  return new KeyboardEvent("keydown", { key: code, bubbles: true, ...opts });
}

describe("createKeyboardPlugin — blockKeys granular option (T3.3)", () => {
  it("blockKeys: ['Space'] blocks Space toggle but ArrowLeft/Right still seek", () => {
    const player = makePlayer();
    const plugin = createKeyboardPlugin({ scope: "global", blockKeys: ["Space"] });
    plugin.setup(player, makeCapturingHost().host);

    document.dispatchEvent(key(" "));
    expect(player.play).not.toHaveBeenCalled();
    expect(player.pause).not.toHaveBeenCalled();

    document.dispatchEvent(key("ArrowLeft"));
    expect(player.seekTo).toHaveBeenCalledWith(25);
  });

  it("arrow keys still fire when blockKeys: ['Space'] is set", () => {
    const player = makePlayer();
    createKeyboardPlugin({ scope: "global", blockKeys: ["Space"] }).setup(
      player,
      makeCapturingHost().host,
    );

    document.dispatchEvent(key("ArrowRight"));
    expect(player.seekTo).toHaveBeenCalledWith(35);
  });

  it("empty blockKeys (default) does not block any key", () => {
    const player = makePlayer();
    createKeyboardPlugin({ scope: "global", blockKeys: [] }).setup(
      player,
      makeCapturingHost().host,
    );

    document.dispatchEvent(key(" "));
    expect(player.play).toHaveBeenCalled();
  });

  it("registers keyboard:setBlockKeys command and updates the set at runtime", () => {
    const player = makePlayer();
    const { host, commands } = makeCapturingHost();
    createKeyboardPlugin({ scope: "global" }).setup(player, host);

    expect(commands.has("keyboard:setBlockKeys")).toBe(true);

    // Initially nothing blocked — Space toggles play.
    document.dispatchEvent(key(" "));
    expect(player.play).toHaveBeenCalledTimes(1);

    // Add Space to the block list.
    commands.get("keyboard:setBlockKeys")?.(["Space"]);
    document.dispatchEvent(key(" "));
    expect(player.play).toHaveBeenCalledTimes(1); // unchanged

    // Clear the block list.
    commands.get("keyboard:setBlockKeys")?.([]);
    document.dispatchEvent(key(" "));
    expect(player.play).toHaveBeenCalledTimes(2);
  });
});
