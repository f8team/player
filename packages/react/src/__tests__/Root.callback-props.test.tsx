/**
 * Callback props on `<Root>` — Phase 2 (T2.3).
 *
 * Replaces the consumer `EventBridge` boilerplate with first-class props.
 * Each callback uses a stable ref so prop identity changes do NOT re-subscribe.
 */
import { createPlayer, type Player } from "@f8/player-core";
import type * as PlayerCore from "@f8/player-core";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Root } from "../components/Root.js";

vi.mock("@f8/player-core", async () => {
  const actual = await vi.importActual<typeof PlayerCore>("@f8/player-core");
  return {
    ...actual,
    createPlayer: vi.fn(() => ({
      ...actual.createPlayer(),
      dispose: vi.fn(),
      attach: vi.fn().mockResolvedValue(undefined),
      detach: vi.fn(),
      subscribe: vi.fn().mockReturnValue(() => undefined),
      setSource: vi.fn(),
      setPlaybackRate: vi.fn(),
      setVolume: vi.fn(),
      setMuted: vi.fn(),
      // Capture event subscribers via vi.fn so tests can replay events
      // through the recorded call list.
      on: vi.fn().mockReturnValue(() => undefined),
    })),
  };
});

function lastPlayer(): Player {
  const calls = (createPlayer as unknown as ReturnType<typeof vi.fn>).mock.results;
  return calls.at(-1)?.value as Player;
}

/** Replay an event to all currently-registered handlers on the latest player. */
function emit(event: string, payload?: unknown): void {
  const player = lastPlayer();
  const onCalls = (player.on as unknown as ReturnType<typeof vi.fn>).mock.calls as Array<
    [string, (payload: unknown) => void]
  >;
  for (const [evName, handler] of onCalls) {
    if (evName === event) handler(payload);
  }
}

describe("Root — onPlay callback prop (G1)", () => {
  it("fires onPlay exactly once when the player emits 'play'", () => {
    const onPlay = vi.fn();
    render(<Root onPlay={onPlay} />);
    emit("play");
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it("does not re-subscribe when the onPlay prop identity changes", () => {
    const spyA = vi.fn();
    const spyB = vi.fn();
    const { rerender } = render(<Root onPlay={spyA} />);
    rerender(<Root onPlay={spyB} />);
    emit("play");
    // Stable-ref pattern: only the latest callback fires; spyA must NOT.
    expect(spyA).not.toHaveBeenCalled();
    expect(spyB).toHaveBeenCalledTimes(1);
  });
});

describe("Root — onPause callback prop (G1)", () => {
  it("fires onPause when the player emits 'pause'", () => {
    const onPause = vi.fn();
    render(<Root onPause={onPause} />);
    emit("pause");
    expect(onPause).toHaveBeenCalledTimes(1);
  });
});

describe("Root — onEnded callback prop", () => {
  it("fires onEnded when the player emits 'ended'", () => {
    const onEnded = vi.fn();
    render(<Root onEnded={onEnded} />);
    emit("ended");
    expect(onEnded).toHaveBeenCalledTimes(1);
  });
});

describe("Root — onError callback prop (G7)", () => {
  it("fires onError with the error payload when the player emits 'error'", () => {
    const onError = vi.fn();
    render(<Root onError={onError} />);
    const err = { code: "PLAYBACK_FAILED", message: "boom" };
    emit("error", err);
    expect(onError).toHaveBeenCalledWith(err);
  });
});

describe("Root — onReady callback prop (G7, G12)", () => {
  it("fires onReady once + onDuration with the same duration when 'ready' emits", () => {
    const onReady = vi.fn();
    const onDuration = vi.fn();
    render(<Root onReady={onReady} onDuration={onDuration} />);
    emit("ready", { duration: 120 });
    expect(onReady).toHaveBeenCalledWith({ duration: 120 });
    expect(onDuration).toHaveBeenCalledWith(120);
  });
});

describe("Root — onProgress callback prop", () => {
  it("fires onProgress with react-player-compatible shape on timeupdate", () => {
    const onProgress = vi.fn();
    render(<Root onProgress={onProgress} />);
    emit("timeupdate", { currentTime: 30, playedSeconds: 30, duration: 120 });
    expect(onProgress).toHaveBeenCalledWith({
      played: 0.25,
      playedSeconds: 30,
      loaded: 0,
      loadedSeconds: 0,
    });
  });
});

describe("Root — onDuration callback prop", () => {
  it("fires onDuration when 'durationchange' emits", () => {
    const onDuration = vi.fn();
    render(<Root onDuration={onDuration} />);
    emit("durationchange", { duration: 200 });
    expect(onDuration).toHaveBeenCalledWith(200);
  });
});

describe("Root — onSeek callback prop (G1)", () => {
  it("fires onSeek with seeked time when 'seeked' emits", () => {
    const onSeek = vi.fn();
    render(<Root onSeek={onSeek} />);
    emit("seeked", { time: 42 });
    expect(onSeek).toHaveBeenCalledWith(42);
  });
});

describe("Root — onStart callback prop", () => {
  it("fires onStart exactly once on the first 'play' (not subsequent plays)", () => {
    const onStart = vi.fn();
    render(<Root onStart={onStart} />);
    emit("play");
    emit("pause");
    emit("play");
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
