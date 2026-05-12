import type { Player, PluginHost, PlayerState } from "@f8/player-core";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { createKeyboardPlugin } from "./keyboard.js";

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

function makeHost(): PluginHost {
  return {
    controls: { contribute: vi.fn().mockReturnValue(() => undefined) },
    commands: {
      add: vi.fn().mockReturnValue(() => undefined),
      run: vi.fn(),
      has: vi.fn().mockReturnValue(false),
    },
    store: {
      getState: vi.fn(),
      subscribe: vi.fn().mockReturnValue(() => undefined),
    },
    emit: vi.fn(),
  } as unknown as PluginHost;
}

function key(code: string, opts: Partial<KeyboardEventInit> = {}): KeyboardEvent {
  return new KeyboardEvent("keydown", { key: code, bubbles: true, ...opts });
}

describe("createKeyboardPlugin", () => {
  it("has name 'keyboard'", () => {
    expect(createKeyboardPlugin().name).toBe("keyboard");
  });

  it("returns immediately when scope=off", () => {
    const plugin = createKeyboardPlugin({ scope: "off" });
    const player = makePlayer();
    const host = makeHost();
    const teardown = plugin.setup(player, host);
    // Should not throw; teardown is a no-op.
    expect(teardown).toBeTypeOf("function");
  });

  describe("global scope (default)", () => {
    let player: Player;
    let host: PluginHost;

    beforeEach(() => {
      player = makePlayer();
      host = makeHost();
      const plugin = createKeyboardPlugin({ scope: "global" });
      plugin.setup(player, host);
    });

    it("Space toggles play when paused", () => {
      document.dispatchEvent(key(" "));
      expect(player.play).toHaveBeenCalled();
    });

    it("Space calls pause when playing", () => {
      const playingPlayer = makePlayer(makeState({ status: "playing" }));
      const h = makeHost();
      createKeyboardPlugin().setup(playingPlayer, h);
      document.dispatchEvent(key(" "));
      expect(playingPlayer.pause).toHaveBeenCalled();
    });

    it("K toggles play", () => {
      document.dispatchEvent(key("k"));
      expect(player.play).toHaveBeenCalled();
    });

    it("ArrowLeft seeks back by seekStep (default 5)", () => {
      document.dispatchEvent(key("ArrowLeft"));
      expect(player.seekTo).toHaveBeenCalledWith(25);
    });

    it("ArrowRight seeks forward by seekStep", () => {
      document.dispatchEvent(key("ArrowRight"));
      expect(player.seekTo).toHaveBeenCalledWith(35);
    });

    it("Shift+ArrowLeft seeks back by longSeekStep (default 10)", () => {
      document.dispatchEvent(key("ArrowLeft", { shiftKey: true }));
      expect(player.seekTo).toHaveBeenCalledWith(20);
    });

    it("Shift+ArrowRight seeks forward by longSeekStep", () => {
      document.dispatchEvent(key("ArrowRight", { shiftKey: true }));
      expect(player.seekTo).toHaveBeenCalledWith(40);
    });

    it("ArrowUp increases volume by 0.1", () => {
      document.dispatchEvent(key("ArrowUp"));
      expect(player.setVolume).toHaveBeenCalledWith(expect.closeTo(0.9, 5));
    });

    it("ArrowDown decreases volume by 0.1", () => {
      document.dispatchEvent(key("ArrowDown"));
      expect(player.setVolume).toHaveBeenCalledWith(expect.closeTo(0.7, 5));
    });

    it("M toggles mute", () => {
      document.dispatchEvent(key("m"));
      expect(player.setMuted).toHaveBeenCalledWith(true);
    });

    it("F triggers fullscreen:toggle command", () => {
      document.dispatchEvent(key("f"));
      expect(host.commands.run).toHaveBeenCalledWith("fullscreen:toggle");
    });

    it("P triggers pip:toggle command", () => {
      document.dispatchEvent(key("p"));
      expect(host.commands.run).toHaveBeenCalledWith("pip:toggle");
    });

    it("clamps ArrowLeft seek to 0", () => {
      const p = makePlayer(makeState({ currentTime: 2 }));
      createKeyboardPlugin().setup(p, makeHost());
      document.dispatchEvent(key("ArrowLeft"));
      // 2 - 5 = clamp to 0
      expect(p.seekTo).toHaveBeenCalledWith(0);
    });

    it("clamps ArrowRight seek to duration", () => {
      const p = makePlayer(makeState({ currentTime: 98, duration: 100 }));
      createKeyboardPlugin().setup(p, makeHost());
      document.dispatchEvent(key("ArrowRight"));
      // 98 + 5 = 103 → clamp to 100
      expect(p.seekTo).toHaveBeenCalledWith(100);
    });

    it("ignores keys when focus is on <input>", () => {
      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();
      const ev = new KeyboardEvent("keydown", { key: " ", bubbles: true });
      Object.defineProperty(ev, "target", { value: input, configurable: true });
      document.dispatchEvent(ev);
      document.body.removeChild(input);
      expect(player.play).not.toHaveBeenCalled();
    });

    it("teardown removes the listener", () => {
      const plugin2 = createKeyboardPlugin();
      const p2 = makePlayer();
      const teardown = plugin2.setup(p2, makeHost());
      teardown?.();
      document.dispatchEvent(key(" "));
      expect(p2.play).not.toHaveBeenCalled();
    });
  });

  it("container scope registers keyboard:installOnContainer command", () => {
    const plugin = createKeyboardPlugin({ scope: "container" });
    const player = makePlayer();
    const host = makeHost();
    plugin.setup(player, host);
    expect(host.commands.add).toHaveBeenCalledWith(
      "keyboard:installOnContainer",
      expect.any(Function),
    );
  });

  describe("keyboard:disable / keyboard:enable commands", () => {
    type CommandHandler = (...args: unknown[]) => void;

    function setupCapturingHost(): { host: PluginHost; commands: Map<string, CommandHandler> } {
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

    it("registers both commands on global scope", () => {
      const player = makePlayer();
      const { host, commands } = setupCapturingHost();
      createKeyboardPlugin().setup(player, host);
      expect(commands.has("keyboard:disable")).toBe(true);
      expect(commands.has("keyboard:enable")).toBe(true);
    });

    it("disable swallows the handler; enable restores it", () => {
      const player = makePlayer();
      const { host, commands } = setupCapturingHost();
      createKeyboardPlugin().setup(player, host);

      // Pre-disable — Space toggles play.
      document.dispatchEvent(key(" "));
      expect(player.play).toHaveBeenCalledTimes(1);

      // Disable — Space is a no-op.
      commands.get("keyboard:disable")?.();
      document.dispatchEvent(key(" "));
      expect(player.play).toHaveBeenCalledTimes(1);

      // Enable — Space works again.
      commands.get("keyboard:enable")?.();
      document.dispatchEvent(key(" "));
      expect(player.play).toHaveBeenCalledTimes(2);
    });

    it("disable also swallows arrow seek + volume + fullscreen/pip commands", () => {
      const player = makePlayer();
      const { host, commands } = setupCapturingHost();
      createKeyboardPlugin().setup(player, host);
      commands.get("keyboard:disable")?.();

      document.dispatchEvent(key("ArrowLeft"));
      document.dispatchEvent(key("ArrowRight"));
      document.dispatchEvent(key("ArrowUp"));
      document.dispatchEvent(key("ArrowDown"));
      document.dispatchEvent(key("m"));
      document.dispatchEvent(key("f"));
      document.dispatchEvent(key("p"));

      expect(player.seekTo).not.toHaveBeenCalled();
      expect(player.setVolume).not.toHaveBeenCalled();
      expect(player.setMuted).not.toHaveBeenCalled();
      expect(host.commands.run).not.toHaveBeenCalled();
    });
  });
});
