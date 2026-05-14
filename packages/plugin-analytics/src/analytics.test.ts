import type { Player, PluginHost, PlayerEvents } from "@f8team/reel-core";
import { describe, expect, it, vi } from "vitest";

import { createAnalyticsPlugin } from "./analytics.js";

type Handler<K extends keyof PlayerEvents> = (payload: PlayerEvents[K]) => void;

function makePlayer(
  currentTime = 0,
  duration = 100,
): Player & {
  fire: <K extends keyof PlayerEvents>(event: K, payload: PlayerEvents[K]) => void;
} {
  const handlers: Partial<{ [K in keyof PlayerEvents]: Handler<K>[] }> = {};
  const state = { currentTime, duration };

  return {
    getState: () => ({
      status: "idle" as const,
      source: null,
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
    on: vi
      .fn()
      .mockImplementation(
        <K extends keyof PlayerEvents>(event: K, handler: Handler<K>): (() => void) => {
          if (!handlers[event]) (handlers as Record<string, unknown[]>)[event as string] = [];
          (handlers[event] as Handler<K>[]).push(handler);
          return () => {
            const list = handlers[event] as Handler<K>[] | undefined;
            if (!list) return;
            const idx = list.indexOf(handler);
            if (idx >= 0) list.splice(idx, 1);
          };
        },
      ),
    fire: <K extends keyof PlayerEvents>(event: K, payload: PlayerEvents[K]) => {
      (handlers[event] as Handler<K>[] | undefined)?.forEach((h) => h(payload));
    },
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
    off: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    dispose: vi.fn(),
    use: vi.fn(),
    removePlugin: vi.fn(),
    commands: { add: vi.fn(), run: vi.fn(), has: vi.fn() },
  } as unknown as Player & {
    fire: <K extends keyof PlayerEvents>(event: K, payload: PlayerEvents[K]) => void;
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

describe("createAnalyticsPlugin", () => {
  it("has name 'analytics'", () => {
    expect(createAnalyticsPlugin({ onEvent: vi.fn() }).name).toBe("analytics");
  });

  it("emits play event", () => {
    const sink = vi.fn();
    const player = makePlayer(10, 100);
    createAnalyticsPlugin({ onEvent: sink }).setup(player, makeHost());
    player.fire("play", undefined);
    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({ type: "play", currentTime: 10, duration: 100 }),
    );
  });

  it("emits pause event", () => {
    const sink = vi.fn();
    const player = makePlayer(20, 100);
    createAnalyticsPlugin({ onEvent: sink }).setup(player, makeHost());
    player.fire("pause", undefined);
    expect(sink).toHaveBeenCalledWith(expect.objectContaining({ type: "pause" }));
  });

  it("emits ended event with percent=100", () => {
    const sink = vi.fn();
    const player = makePlayer(100, 100);
    createAnalyticsPlugin({ onEvent: sink }).setup(player, makeHost());
    player.fire("ended", undefined);
    expect(sink).toHaveBeenCalledWith(expect.objectContaining({ type: "ended", percent: 100 }));
  });

  it("emits error event", () => {
    const sink = vi.fn();
    const player = makePlayer();
    createAnalyticsPlugin({ onEvent: sink }).setup(player, makeHost());
    player.fire("error", {
      code: "network",
      message: "net",
      retryable: true,
    });
    expect(sink).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }));
  });

  it("emits seek event on seeked", () => {
    const sink = vi.fn();
    const player = makePlayer();
    createAnalyticsPlugin({ onEvent: sink }).setup(player, makeHost());
    player.fire("seeked", { time: 30 });
    expect(sink).toHaveBeenCalledWith(expect.objectContaining({ type: "seek", currentTime: 30 }));
  });

  it("emits progress event after interval", () => {
    const sink = vi.fn();
    const player = makePlayer(0, 100);
    createAnalyticsPlugin({ onEvent: sink, progressInterval: 10 }).setup(player, makeHost());
    player.fire("play", undefined);
    sink.mockClear();
    player.fire("timeupdate", { currentTime: 12, playedSeconds: 12, duration: 100 });
    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({ type: "progress", currentTime: 12, percent: 12 }),
    );
  });

  it("does not emit progress when progressInterval=0", () => {
    const sink = vi.fn();
    const player = makePlayer();
    createAnalyticsPlugin({ onEvent: sink, progressInterval: 0 }).setup(player, makeHost());
    player.fire("timeupdate", { currentTime: 50, playedSeconds: 50, duration: 100 });
    expect(sink).not.toHaveBeenCalledWith(expect.objectContaining({ type: "progress" }));
  });

  it("teardown removes all listeners", () => {
    const sink = vi.fn();
    const player = makePlayer();
    const teardown = createAnalyticsPlugin({ onEvent: sink }).setup(player, makeHost());
    teardown?.();
    player.fire("play", undefined);
    expect(sink).not.toHaveBeenCalled();
  });
});
