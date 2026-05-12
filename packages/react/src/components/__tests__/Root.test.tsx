import { createPlayer } from "@f8/player-core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { usePlayer } from "../../hooks/usePlayer.js";
import { Root } from "../Root.js";

vi.mock("@f8/player-core", async () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await vi.importActual<typeof import("@f8/player-core")>("@f8/player-core");
  return {
    ...actual,
    createPlayer: vi.fn(() => ({
      ...actual.createPlayer(),
      dispose: vi.fn(),
      attach: vi.fn().mockResolvedValue(undefined),
      detach: vi.fn(),
      subscribe: vi.fn().mockReturnValue(() => undefined),
      on: vi.fn().mockReturnValue(() => undefined),
      getState: vi.fn().mockReturnValue({
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
      }),
    })),
  };
});

function Readout(): JSX.Element {
  const player = usePlayer();
  return <div data-testid="ok">{player ? "has-player" : "no-player"}</div>;
}

describe("<Root>", () => {
  it("provides a player instance to children", () => {
    render(
      <Root>
        <Readout />
      </Root>,
    );
    expect(screen.getByTestId("ok").textContent).toBe("has-player");
  });

  it("calls createPlayer once on mount", () => {
    render(
      <Root options={{ muted: true }}>
        <span />
      </Root>,
    );
    expect((createPlayer as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
  });

  it("disposes the player on unmount", () => {
    const { unmount } = render(
      <Root>
        <span />
      </Root>,
    );
    const player = (createPlayer as ReturnType<typeof vi.fn>).mock.results.at(-1)?.value;
    unmount();
    expect(player?.dispose).toHaveBeenCalled();
  });

  it("invokes playerRef callback with the player instance", () => {
    const cb = vi.fn();
    render(
      <Root playerRef={cb}>
        <span />
      </Root>,
    );
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ dispose: expect.any(Function) }));
  });
});
