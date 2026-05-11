import type { Player, PlayerState } from "@f8/player-core";
import { vi } from "vitest";


export function makeInitialState(overrides: Partial<PlayerState> = {}): PlayerState {
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

/**
 * Creates a minimal `Player` mock usable in React tests. Subscribers are
 * invoked synchronously when `mockSetState` is called.
 */
export function makeMockPlayer(initialState: Partial<PlayerState> = {}): {
  player: Player;
  mockSetState: (patch: Partial<PlayerState>) => void;
} {
  let state = makeInitialState(initialState);
  type Sub = { selector: (s: PlayerState) => unknown; listener: (v: unknown) => void };
  const subs: Sub[] = [];
  type EvSub = { event: string; handler: (...args: unknown[]) => void };
  const evSubs: EvSub[] = [];

  function mockSetState(patch: Partial<PlayerState>): void {
    state = { ...state, ...patch };
    for (const sub of subs.slice()) {
      sub.listener(sub.selector(state));
    }
  }

  const commandsMock = {
    run: vi.fn().mockResolvedValue(undefined),
    add: vi.fn(),
    has: vi.fn().mockReturnValue(false),
  };

  const player: Player = {
    getState: () => state,
    getSource: () => state.source,
    getCurrentTime: () => state.currentTime,
    getDuration: () => state.duration,
    getBuffered: () => state.buffered.slice(),
    setSource: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    paused: vi.fn().mockReturnValue(true),
    seekTo: vi.fn(),
    setPlaybackRate: vi.fn(),
    setVolume: vi.fn(),
    setMuted: vi.fn(),
    subscribe: vi.fn((selector, listener) => {
      const sub: Sub = { selector, listener };
      subs.push(sub);
      return () => {
        const idx = subs.indexOf(sub);
        if (idx >= 0) subs.splice(idx, 1);
      };
    }),
    on: vi.fn((event, handler) => {
      const sub: EvSub = { event, handler: handler as (...args: unknown[]) => void };
      evSubs.push(sub);
      return () => {
        const idx = evSubs.indexOf(sub);
        if (idx >= 0) evSubs.splice(idx, 1);
      };
    }),
    off: vi.fn(),
    attach: vi.fn().mockResolvedValue(undefined),
    detach: vi.fn(),
    dispose: vi.fn(),
    use: vi.fn(),
    removePlugin: vi.fn(),
    commands: commandsMock as unknown as Player["commands"],
  };

  return { player, mockSetState };
}
