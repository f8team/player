import type { Player, PluginHost, PlayerEvents } from "@f8/player-core";
import { describe, expect, it, vi } from "vitest";

import { createResumePositionPlugin } from "./resume-position.js";
import type { ResumePositionStorage } from "./resume-position.js";

type Handler<K extends keyof PlayerEvents> = (payload: PlayerEvents[K]) => void;

function makeStorage(): ResumePositionStorage & { _data: Map<string, number> } {
  const data = new Map<string, number>();
  return {
    _data: data,
    get: (k) => data.get(k),
    set: (k, v) => {
      data.set(k, v);
    },
    delete: (k) => {
      data.delete(k);
    },
  };
}

function makePlayer(
  overrides: {
    currentTime?: number;
    duration?: number;
    src?: string;
  } = {},
) {
  const {
    currentTime = 30,
    duration = 100,
    src = "https://cdn.example.com/video.m3u8",
  } = overrides;
  const handlers: Partial<{ [K in keyof PlayerEvents]: Handler<K>[] }> = {};
  const state = { currentTime, duration };

  const player = {
    getState: () => ({
      status: "idle" as const,
      source: { src },
      currentTime: state.currentTime,
      duration: state.duration,
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
    getSource: () => ({ src }),
    on: vi
      .fn()
      .mockImplementation(<K extends keyof PlayerEvents>(event: K, handler: Handler<K>) => {
        if (!handlers[event]) (handlers as Record<string, unknown[]>)[event as string] = [];
        (handlers[event] as Handler<K>[]).push(handler);
        return () => {
          const list = handlers[event] as Handler<K>[] | undefined;
          if (!list) return;
          const idx = list.indexOf(handler);
          if (idx >= 0) list.splice(idx, 1);
        };
      }),
    seekTo: vi.fn(),
    fire: <K extends keyof PlayerEvents>(event: K, payload?: PlayerEvents[K]) => {
      (handlers[event] as Handler<K>[] | undefined)?.forEach((h) => h(payload as PlayerEvents[K]));
    },
    play: vi.fn(),
    pause: vi.fn(),
    paused: vi.fn(),
    setPlaybackRate: vi.fn(),
    setVolume: vi.fn(),
    setMuted: vi.fn(),
    setSource: vi.fn(),
    getCurrentTime: vi.fn(),
    getDuration: vi.fn(),
    getBuffered: vi.fn(),
    subscribe: vi.fn().mockReturnValue(() => undefined),
    off: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    dispose: vi.fn(),
    use: vi.fn(),
    removePlugin: vi.fn(),
    commands: { add: vi.fn().mockReturnValue(() => undefined), run: vi.fn(), has: vi.fn() },
  };

  return player as typeof player & {
    fire: <K extends keyof PlayerEvents>(event: K, payload?: PlayerEvents[K]) => void;
  };
}

function makeHost(): PluginHost {
  return {
    controls: { contribute: vi.fn().mockReturnValue(() => undefined) },
    commands: { add: vi.fn().mockReturnValue(() => undefined), run: vi.fn(), has: vi.fn() },
    store: { getState: vi.fn(), subscribe: vi.fn().mockReturnValue(() => undefined) },
    emit: vi.fn(),
  } as unknown as PluginHost;
}

describe("createResumePositionPlugin", () => {
  it("has name 'resume-position'", () => {
    expect(createResumePositionPlugin().name).toBe("resume-position");
  });

  it("saves position on pause", () => {
    const storage = makeStorage();
    const player = makePlayer({ currentTime: 30, duration: 100 });
    createResumePositionPlugin({ storage }).setup(player as unknown as Player, makeHost());
    player.fire("pause", undefined);
    expect(storage._data.get("https://cdn.example.com/video.m3u8")).toBe(30);
  });

  it("seeks to saved position on ready", () => {
    const storage = makeStorage();
    storage.set("https://cdn.example.com/video.m3u8", 42);
    const player = makePlayer();
    createResumePositionPlugin({ storage }).setup(player as unknown as Player, makeHost());
    player.fire("ready", { duration: 100 });
    expect(player.seekTo).toHaveBeenCalledWith(42);
  });

  it("does not seek when saved position is below minSeconds", () => {
    const storage = makeStorage();
    storage.set("https://cdn.example.com/video.m3u8", 1);
    const player = makePlayer();
    createResumePositionPlugin({ storage, minSeconds: 3 }).setup(
      player as unknown as Player,
      makeHost(),
    );
    player.fire("ready", { duration: 100 });
    expect(player.seekTo).not.toHaveBeenCalled();
  });

  it("clears position when near the end (endThreshold)", () => {
    const storage = makeStorage();
    storage.set("https://cdn.example.com/video.m3u8", 30);
    // Current time near end: duration=100, currentTime=97 → within 5s threshold
    const player = makePlayer({ currentTime: 97, duration: 100 });
    createResumePositionPlugin({ storage, endThreshold: 5 }).setup(
      player as unknown as Player,
      makeHost(),
    );
    player.fire("pause", undefined);
    expect(storage._data.has("https://cdn.example.com/video.m3u8")).toBe(false);
  });

  it("clears position on ended", () => {
    const storage = makeStorage();
    storage.set("https://cdn.example.com/video.m3u8", 30);
    const player = makePlayer();
    createResumePositionPlugin({ storage }).setup(player as unknown as Player, makeHost());
    player.fire("ended", undefined);
    expect(storage._data.has("https://cdn.example.com/video.m3u8")).toBe(false);
  });

  it("teardown removes listeners", () => {
    const storage = makeStorage();
    const player = makePlayer();
    const teardown = createResumePositionPlugin({ storage }).setup(
      player as unknown as Player,
      makeHost(),
    );
    teardown?.();
    player.fire("pause", undefined);
    expect(storage._data.size).toBe(0);
  });
});
