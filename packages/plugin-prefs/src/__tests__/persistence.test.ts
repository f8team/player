/**
 * `@f8team/reel-plugin-prefs` — persistence semantics (Phase 3 T3.2).
 *
 * Cross-checked against `f8-ui` `PersistPrefs` (the canonical reference).
 */
import type { Player, PluginHost, PlayerEvents, PlayerState } from "@f8team/reel-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createPrefsPlugin } from "../prefs.js";

// ── Test harness ───────────────────────────────────────────────────────────

const STORAGE_KEY = "reel-player:prefs";

type Handler = (payload: unknown) => void;

function makeState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
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
    ...overrides,
  };
}

function makePlayer(initialState = makeState()): {
  player: Player;
  emit: <K extends keyof PlayerEvents>(event: K, payload?: PlayerEvents[K]) => void;
  state: PlayerState;
  setState(patch: Partial<PlayerState>): void;
} {
  let state = initialState;
  const handlers = new Map<string, Set<Handler>>();
  type Sub = { sel: (s: PlayerState) => unknown; cb: (v: unknown) => void };
  const subs = new Set<Sub>();

  const player: Player = {
    getState: () => state,
    getSource: () => state.source,
    getCurrentTime: () => state.currentTime,
    getDuration: () => state.duration,
    getBuffered: () => state.buffered.slice(),
    setSource: vi.fn(),
    retry: vi.fn().mockReturnValue(false),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    paused: vi.fn().mockReturnValue(true),
    seekTo: vi.fn(),
    setPlaybackRate: vi.fn(),
    setVolume: vi.fn(),
    setMuted: vi.fn(),
    subscribe: vi.fn((sel, cb) => {
      const sub: Sub = { sel: sel as Sub["sel"], cb: cb as Sub["cb"] };
      subs.add(sub);
      return () => subs.delete(sub);
    }) as Player["subscribe"],
    on: vi.fn((event: string, h: Handler) => {
      let set = handlers.get(event);
      if (!set) {
        set = new Set();
        handlers.set(event, set);
      }
      set.add(h);
      return () => set!.delete(h);
    }) as Player["on"],
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
    } as unknown as Player["commands"],
  };

  return {
    player,
    state,
    setState(patch) {
      state = { ...state, ...patch };
      for (const sub of subs) sub.cb(sub.sel(state));
    },
    emit(event, payload) {
      const set = handlers.get(event as string);
      if (!set) return;
      for (const h of set) h(payload as unknown);
    },
  };
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

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("createPrefsPlugin — restore on 'ready' (T3.2)", () => {
  it("restores volume, muted, playbackRate from localStorage when 'ready' fires", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ volume: 0.5, muted: false, playbackRate: 1.5 }),
    );
    const { player, emit } = makePlayer();
    createPrefsPlugin().setup(player, makeHost());

    emit("ready", { duration: 100 });

    expect(player.setVolume).toHaveBeenCalledWith(0.5);
    expect(player.setMuted).toHaveBeenCalledWith(false);
    expect(player.setPlaybackRate).toHaveBeenCalledWith(1.5);
  });
});

describe("createPrefsPlugin — save on volumechange/ratechange/qualitychange (T3.2)", () => {
  it("writes volume + muted to localStorage after first play", async () => {
    const { player, emit } = makePlayer();
    createPrefsPlugin().setup(player, makeHost());

    // First play — schedules allowVolumeSave on a microtask.
    emit("play");
    await Promise.resolve();
    emit("volumechange", { volume: 0.7, muted: false });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored.volume).toBe(0.7);
    expect(stored.muted).toBe(false);
  });

  it("writes playbackRate to localStorage when 'ratechange' fires", () => {
    const { player, emit } = makePlayer();
    createPrefsPlugin().setup(player, makeHost());

    emit("ratechange", { playbackRate: 1.25 });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored.playbackRate).toBe(1.25);
  });

  it("writes qualityHeight on user-driven 'qualitychange' (auto: false) only", () => {
    const { player, emit } = makePlayer();
    createPrefsPlugin().setup(player, makeHost());

    emit("qualitychange", {
      quality: { id: "0", height: 720, bitrate: 1_000_000, label: "720p" },
      auto: false,
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").qualityHeight).toBe(720);

    // Simulate ABR auto-switch — must NOT overwrite the user pref.
    emit("qualitychange", {
      quality: { id: "1", height: 360, bitrate: 600_000, label: "360p" },
      auto: true,
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").qualityHeight).toBe(720);
  });
});

describe("createPrefsPlugin — lock options (T3.2)", () => {
  it("does NOT update volume in localStorage when lockVolume: true", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume: 0.3 }));
    const { player, emit } = makePlayer();
    createPrefsPlugin({ lockVolume: true }).setup(player, makeHost());

    emit("play");
    await Promise.resolve();
    emit("volumechange", { volume: 0.9, muted: false });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored.volume).toBe(0.3); // unchanged
  });
});

describe("createPrefsPlugin — SSR guard (T3.2)", () => {
  it("does not throw when window.localStorage is unavailable (SSR context)", () => {
    const realWindow = globalThis.window;
    // @ts-expect-error simulate SSR by removing window
    delete globalThis.window;
    try {
      const { player } = makePlayer();
      const teardown = createPrefsPlugin().setup(player, makeHost());
      expect(typeof teardown).toBe("function");
      // No-op teardown — narrow the union for the call.
      if (typeof teardown === "function") teardown();
    } finally {
      globalThis.window = realWindow;
    }
  });
});

describe("createPrefsPlugin — autoplay-muted bootstrap defer (T3.2)", () => {
  it("does NOT save volume on the synthetic volumechange before first real play", () => {
    const { player, emit } = makePlayer();
    createPrefsPlugin().setup(player, makeHost());

    // Browser muted-autoplay synthetic event before play().
    emit("volumechange", { volume: 1, muted: true });

    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).toBeNull();
  });
});

describe("createPrefsPlugin — multi-player key isolation (T3.2)", () => {
  it("uses separate storageKey when two players are mounted on the same page", async () => {
    const a = makePlayer();
    const b = makePlayer();
    createPrefsPlugin({ storageKey: "f8-prefs:a" }).setup(a.player, makeHost());
    createPrefsPlugin({ storageKey: "f8-prefs:b" }).setup(b.player, makeHost());

    a.emit("ratechange", { playbackRate: 1.5 });
    b.emit("ratechange", { playbackRate: 2 });

    const aPrefs = JSON.parse(localStorage.getItem("f8-prefs:a") ?? "{}");
    const bPrefs = JSON.parse(localStorage.getItem("f8-prefs:b") ?? "{}");
    expect(aPrefs.playbackRate).toBe(1.5);
    expect(bPrefs.playbackRate).toBe(2);
  });
});
