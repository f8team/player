import type { Player } from "@f8/player-core";
import { act, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { makeInitialState } from "../../test-utils/mockPlayer.js";
import { renderWithPlayer } from "../../test-utils/renderWithPlayer.js";
import { usePlayerState } from "../usePlayerState.js";

const TIMEUPDATE_TICKS = 60;

function StatusDisplay(): JSX.Element {
  const status = usePlayerState((s) => s.status);
  return <div data-testid="status">{status}</div>;
}

describe("usePlayerState", () => {
  it("renders the initial state value", () => {
    renderWithPlayer(<StatusDisplay />, { initialState: { status: "idle" } });
    expect(screen.getByTestId("status").textContent).toBe("idle");
  });

  it("updates when the selected slice changes", () => {
    const { mockSetState } = renderWithPlayer(<StatusDisplay />);
    act(() => mockSetState({ status: "playing" }));
    expect(screen.getByTestId("status").textContent).toBe("playing");
  });

  it("does NOT re-render when an unrelated slice changes", () => {
    let renderCount = 0;
    function OnlyStatus(): JSX.Element {
      renderCount += 1;
      const status = usePlayerState((s) => s.status);
      return <div data-testid="status">{status}</div>;
    }
    const { mockSetState } = renderWithPlayer(<OnlyStatus />, {
      initialState: { status: "idle", currentTime: 0 },
    });
    const before = renderCount;
    act(() => mockSetState({ currentTime: 10 }));
    expect(renderCount).toBe(before); // no re-render
    act(() => mockSetState({ status: "playing" }));
    expect(renderCount).toBe(before + 1);
  });

  it("renders once per selected timeupdate tick", () => {
    let renderCount = 0;
    function CurrentTimeDisplay(): JSX.Element {
      renderCount += 1;
      const currentTime = usePlayerState((s) => s.currentTime);
      return <div data-testid="current-time">{currentTime}</div>;
    }

    const { mockSetState } = renderWithPlayer(<CurrentTimeDisplay />, {
      initialState: { currentTime: 0 },
    });
    const before = renderCount;

    for (let tick = 1; tick <= TIMEUPDATE_TICKS; tick += 1) {
      act(() => mockSetState({ currentTime: tick }));
    }

    expect(renderCount).toBe(before + TIMEUPDATE_TICKS);
    expect(screen.getByTestId("current-time").textContent).toBe(String(TIMEUPDATE_TICKS));
  });

  it("unsubscribes on unmount", () => {
    const unsubscribe = vi.fn();
    const player = {
      getState: () => makeInitialState({ status: "idle" }),
      subscribe: vi.fn(() => unsubscribe),
    } as unknown as Player;

    const { unmount } = renderWithPlayer(<StatusDisplay />, { player });

    expect(player.subscribe).toHaveBeenCalledTimes(1);
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("throws outside PlayerContext", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("@testing-library/react").render(<StatusDisplay />),
    ).toThrow(/usePlayer\* hooks must be used inside <Player.Root>/);
    spy.mockRestore();
  });
});
