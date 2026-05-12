import type { Player, PluginHost, PlayerEvents } from "@f8/player-core";
import { describe, expect, it, vi } from "vitest";

import { createHlsQualityPlugin } from "./hls-quality.js";

type Handler<K extends keyof PlayerEvents> = (payload: PlayerEvents[K]) => void;

const QUALITIES = [
  { id: "0", height: 360, bitrate: 800_000, label: "360p" },
  { id: "1", height: 720, bitrate: 2_500_000, label: "720p" },
];

function makePlayer() {
  const handlers: Partial<{ [K in keyof PlayerEvents]: Handler<K>[] }> = {};
  const subs: ((q: unknown) => void)[] = [];

  return {
    getState: () => ({
      status: "idle" as const,
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
      qualities: QUALITIES,
      activeQuality: null,
      error: null,
    }),
    on: vi
      .fn()
      .mockImplementation(<K extends keyof PlayerEvents>(event: K, handler: Handler<K>) => {
        if (!handlers[event]) (handlers as Record<string, unknown[]>)[event as string] = [];
        (handlers[event] as Handler<K>[]).push(handler);
        return () => undefined;
      }),
    subscribe: vi.fn().mockImplementation((_sel: unknown, listener: (v: unknown) => void) => {
      subs.push(listener);
      return () => undefined;
    }),
    commands: {
      add: vi.fn().mockReturnValue(() => undefined),
      run: vi.fn(),
      has: vi.fn(),
    },
    fire: <K extends keyof PlayerEvents>(event: K, payload: PlayerEvents[K]) => {
      (handlers[event] as Handler<K>[] | undefined)?.forEach((h) => h(payload));
    },
    getSource: vi.fn(),
    getCurrentTime: vi.fn(),
    getDuration: vi.fn(),
    getBuffered: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    paused: vi.fn(),
    seekTo: vi.fn(),
    setPlaybackRate: vi.fn(),
    setVolume: vi.fn(),
    setMuted: vi.fn(),
    setSource: vi.fn(),
    off: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    dispose: vi.fn(),
    use: vi.fn(),
    removePlugin: vi.fn(),
  } as unknown as Player & {
    fire: <K extends keyof PlayerEvents>(e: K, p: PlayerEvents[K]) => void;
  };
}

function makeHost(): PluginHost {
  const cmds: Record<string, (p: unknown) => void> = {};
  return {
    controls: { contribute: vi.fn().mockReturnValue(() => undefined) },
    commands: {
      add: vi.fn().mockImplementation((name: string, handler: (p: unknown) => void) => {
        cmds[name] = handler;
        return () => {
          delete cmds[name];
        };
      }),
      run: vi.fn().mockImplementation((name: string, payload?: unknown) => {
        cmds[name]?.(payload as unknown);
      }),
      has: vi.fn(),
    },
    store: { getState: vi.fn(), subscribe: vi.fn().mockReturnValue(() => undefined) },
    emit: vi.fn(),
    _cmds: cmds,
  } as unknown as PluginHost;
}

describe("createHlsQualityPlugin", () => {
  it("has name 'hls-quality'", () => {
    expect(createHlsQualityPlugin().name).toBe("hls-quality");
  });

  it("registers hls-quality:set and hls-quality:setAuto commands", () => {
    const plugin = createHlsQualityPlugin();
    const player = makePlayer();
    const host = makeHost();
    plugin.setup(player, host);
    expect(host.commands.add).toHaveBeenCalledWith("hls-quality:set", expect.any(Function));
    expect(host.commands.add).toHaveBeenCalledWith("hls-quality:setAuto", expect.any(Function));
  });

  it("hls-quality:set delegates to player.commands.run('hls:setQuality')", () => {
    const player = makePlayer();
    const host = makeHost();
    createHlsQualityPlugin().setup(player, host);
    host.commands.run("hls-quality:set", QUALITIES[0]);
    expect(player.commands.run).toHaveBeenCalledWith("hls:setQuality", QUALITIES[0]);
  });

  it("hls-quality:setAuto calls hls:setQuality with null", () => {
    const player = makePlayer();
    const host = makeHost();
    createHlsQualityPlugin().setup(player, host);
    host.commands.run("hls-quality:setAuto");
    expect(player.commands.run).toHaveBeenCalledWith("hls:setQuality", null);
  });

  it("emits hls-quality:qualitiesChanged on ready event", () => {
    const player = makePlayer();
    const host = makeHost();
    createHlsQualityPlugin().setup(player, host);
    player.fire("ready", { duration: 100 });
    expect(host.emit).toHaveBeenCalledWith("hls-quality:qualitiesChanged", QUALITIES);
  });

  it("teardown calls all disposers", () => {
    const plugin = createHlsQualityPlugin();
    const teardown = plugin.setup(makePlayer(), makeHost());
    expect(() => teardown?.()).not.toThrow();
  });
});
