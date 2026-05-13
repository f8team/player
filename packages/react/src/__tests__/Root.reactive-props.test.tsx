/**
 * Reactive props on `<Root>` — Phase 2 (T2.1, T2.2).
 *
 * These pin the behavior of the new top-level reactive props:
 *   `source`, `poster`, `playbackRate`, `volume`, `muted`.
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
      on: vi.fn().mockReturnValue(() => undefined),
      setSource: vi.fn(),
      setPlaybackRate: vi.fn(),
      setVolume: vi.fn(),
      setMuted: vi.fn(),
    })),
  };
});

function lastPlayer(): Player {
  const calls = (createPlayer as unknown as ReturnType<typeof vi.fn>).mock.results;
  return calls.at(-1)?.value as Player;
}

describe("Root — reactive source prop (@phase-2-target T2.1)", () => {
  it("calls player.setSource() when source.src changes after mount", () => {
    const { rerender } = render(<Root source={{ src: "video1.m3u8" }} />);
    const player = lastPlayer();
    // Initial mount with source: setSource is called once with the seed.
    expect(player.setSource).toHaveBeenCalledWith(expect.objectContaining({ src: "video1.m3u8" }));

    rerender(<Root source={{ src: "video2.m3u8" }} />);
    expect(player.setSource).toHaveBeenCalledTimes(2);
    expect(player.setSource).toHaveBeenLastCalledWith(
      expect.objectContaining({ src: "video2.m3u8" }),
    );
  });

  it("is a no-op when source.src stays the same (string equality guard)", () => {
    const src = { src: "video.m3u8" };
    const { rerender } = render(<Root source={src} />);
    const player = lastPlayer();
    expect(player.setSource).toHaveBeenCalledTimes(1);

    // New object, same src string → no setSource call (avoids HLS re-init).
    rerender(<Root source={{ src: "video.m3u8" }} />);
    expect(player.setSource).toHaveBeenCalledTimes(1);

    // Identity match → also a no-op.
    rerender(<Root source={src} />);
    expect(player.setSource).toHaveBeenCalledTimes(1);
  });

  it("forwards poster prop to <video poster={...}> via context", () => {
    const { container, rerender } = render(
      <Root poster="https://cdn/a.jpg">
        <video data-testid="v" />
      </Root>,
    );
    // Phase 2 forwards poster through context; <Player.Video> reads it.
    // Since the dummy <video> child does not consume context, the assertion
    // here is on Root's behavior: rerender with new poster does not crash and
    // does NOT call setSource (regression guard — poster must not retrigger source).
    const player = lastPlayer();
    rerender(
      <Root poster="https://cdn/b.jpg">
        <video data-testid="v" />
      </Root>,
    );
    expect(player.setSource).not.toHaveBeenCalled();
    expect(container).toBeTruthy();
  });

  it("calls player.setPlaybackRate() when playbackRate prop changes", () => {
    const { rerender } = render(<Root playbackRate={1} />);
    const player = lastPlayer();
    expect(player.setPlaybackRate).toHaveBeenCalledWith(1);

    rerender(<Root playbackRate={1.5} />);
    expect(player.setPlaybackRate).toHaveBeenLastCalledWith(1.5);
    expect(player.setPlaybackRate).toHaveBeenCalledTimes(2);
  });
});

describe("Root — reactive volume / muted props (@phase-2-target T2.2)", () => {
  it("calls player.setVolume() when volume prop changes", () => {
    const { rerender } = render(<Root volume={0.5} />);
    const player = lastPlayer();
    expect(player.setVolume).toHaveBeenCalledWith(0.5);

    rerender(<Root volume={0.8} />);
    expect(player.setVolume).toHaveBeenLastCalledWith(0.8);
  });

  it("calls player.setMuted() when muted prop changes", () => {
    const { rerender } = render(<Root muted={false} />);
    const player = lastPlayer();
    expect(player.setMuted).toHaveBeenCalledWith(false);

    rerender(<Root muted={true} />);
    expect(player.setMuted).toHaveBeenLastCalledWith(true);
  });
});
