import type { Player, PluginHost, PlayerEvents } from "@f8team/reel-core";
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
    status?: "idle" | "loading" | "ready" | "playing" | "paused" | "ended" | "error";
    source?: { src: string } | null;
  } = {},
) {
  const {
    currentTime = 30,
    duration = 100,
    src = "https://cdn.example.com/video.m3u8",
    status = "idle" as const,
    source,
  } = overrides;
  const effectiveSource = source !== undefined ? source : { src };
  const handlers: Partial<{ [K in keyof PlayerEvents]: Handler<K>[] }> = {};
  const state = { currentTime, duration };

  const player = {
    getState: () => ({
      status,
      source: effectiveSource,
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
    getSource: () => effectiveSource,
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

  it("saves position on pagehide / visibilitychange (iOS Safari) (A8)", () => {
    const storage = makeStorage();
    const player = makePlayer({ currentTime: 55, duration: 100 });
    createResumePositionPlugin({ storage }).setup(player as unknown as Player, makeHost());

    // pagehide is fired by iOS Safari when the user swipes the tab away.
    window.dispatchEvent(new Event("pagehide"));
    expect(storage._data.get("https://cdn.example.com/video.m3u8")).toBe(55);

    storage._data.clear();

    // visibilitychange with state=hidden also persists.
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(storage._data.get("https://cdn.example.com/video.m3u8")).toBe(55);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
  });

  it("periodically saves while playing (A8)", () => {
    vi.useFakeTimers();
    try {
      const storage = makeStorage();
      const player = makePlayer({ currentTime: 42, duration: 100 });
      createResumePositionPlugin({ storage, saveIntervalMs: 1_000 }).setup(
        player as unknown as Player,
        makeHost(),
      );

      // Periodic save only runs after "play" fires.
      player.fire("play", undefined);
      vi.advanceTimersByTime(2_500);
      expect(storage._data.get("https://cdn.example.com/video.m3u8")).toBe(42);

      // Pause stops the interval — no more writes while paused.
      storage._data.clear();
      player.fire("pause", undefined);
      vi.advanceTimersByTime(5_000);
      // Only the synchronous "pause" save counts, not interval ticks.
      expect(storage._data.get("https://cdn.example.com/video.m3u8")).toBe(42);
      const beforeAdvance = storage._data.get("https://cdn.example.com/video.m3u8");
      vi.advanceTimersByTime(5_000);
      expect(storage._data.get("https://cdn.example.com/video.m3u8")).toBe(beforeAdvance);
    } finally {
      vi.useRealTimers();
    }
  });

  it("saveIntervalMs=0 disables periodic saves (A8)", () => {
    vi.useFakeTimers();
    try {
      const storage = makeStorage();
      const player = makePlayer({ currentTime: 10, duration: 100 });
      createResumePositionPlugin({ storage, saveIntervalMs: 0 }).setup(
        player as unknown as Player,
        makeHost(),
      );
      player.fire("play", undefined);
      vi.advanceTimersByTime(60_000);
      expect(storage._data.size).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("seeks immediately when registered after the player is ready (A9)", () => {
    const storage = makeStorage();
    storage.set("https://cdn.example.com/video.m3u8", 25);
    const player = makePlayer({ status: "ready" });
    createResumePositionPlugin({ storage }).setup(player as unknown as Player, makeHost());
    // No "ready" event was fired — we mounted after the transition.
    expect(player.seekTo).toHaveBeenCalledWith(25);
  });

  it("seeks immediately when registered after playing/paused/ended status (A9)", () => {
    for (const status of ["playing", "paused", "ended"] as const) {
      const storage = makeStorage();
      storage.set("https://cdn.example.com/video.m3u8", 17);
      const player = makePlayer({ status });
      createResumePositionPlugin({ storage }).setup(player as unknown as Player, makeHost());
      expect(player.seekTo).toHaveBeenCalledWith(17);
    }
  });

  it("uses keyFn instead of source.src when provided (C4)", () => {
    const storage = makeStorage();
    storage.set("course:42:lesson:7", 88);

    // Simulate a signed S3 URL that changes between requests.
    const player = makePlayer({
      src: "https://cdn.example.com/video.m3u8?Expires=1234&Signature=abc",
      status: "ready",
    });

    createResumePositionPlugin({
      storage,
      keyFn: () => "course:42:lesson:7",
    }).setup(player as unknown as Player, makeHost());

    expect(player.seekTo).toHaveBeenCalledWith(88);
  });

  it("keyFn returning null disables persistence for that source (C4)", () => {
    const storage = makeStorage();
    const player = makePlayer({ currentTime: 50, duration: 100 });
    createResumePositionPlugin({
      storage,
      keyFn: () => null,
    }).setup(player as unknown as Player, makeHost());

    player.fire("pause", undefined);
    expect(storage._data.size).toBe(0);
  });

  it("teardown removes window + document listeners (A8)", () => {
    const storage = makeStorage();
    const player = makePlayer({ currentTime: 20, duration: 100 });
    const teardown = createResumePositionPlugin({ storage }).setup(
      player as unknown as Player,
      makeHost(),
    );
    teardown?.();

    // After teardown, neither pagehide nor visibilitychange should write.
    window.dispatchEvent(new Event("pagehide"));
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(storage._data.size).toBe(0);

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
  });
});
