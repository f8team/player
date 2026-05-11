import { act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PlayerContext } from "../../context/PlayerContext.js";
import { makeMockPlayer } from "../../test-utils/mockPlayer.js";
import { renderWithPlayer } from "../../test-utils/renderWithPlayer.js";
import { usePlayerEvent } from "../usePlayerEvent.js";

function EventCounter({ eventName }: { eventName: "play" | "pause" | "ended" }): JSX.Element {
  const count = { current: 0 };
  usePlayerEvent(eventName, () => {
    count.current += 1;
  });
  return <div data-testid="count">{count.current}</div>;
}

describe("usePlayerEvent", () => {
  it("registers an event listener on mount", () => {
    const { player } = renderWithPlayer(<EventCounter eventName="play" />);
    expect((player.on as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
    const call = (player.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => c[0] === "play",
    );
    expect(call).toBeDefined();
  });

  it("does not re-register when the component re-renders with the same event", () => {
    const { player, rerender } = renderWithPlayer(<EventCounter eventName="play" />);
    const firstCount = (player.on as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c: unknown[]) => c[0] === "play",
    ).length;
    // Rerender with same context wrapper — player.on should NOT be called again.
    const ctx = { player, options: {} };
    rerender(
      <PlayerContext.Provider value={ctx}>
        <EventCounter eventName="play" />
      </PlayerContext.Provider>,
    );
    const secondCount = (player.on as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c: unknown[]) => c[0] === "play",
    ).length;
    expect(secondCount).toBe(firstCount);
  });

  it("invokes the latest handler even when it changes between renders", () => {
    let callValue: unknown = null;

    function DynamicHandler({ prefix }: { prefix: string }): null {
      usePlayerEvent("timeupdate", (payload) => {
        callValue = `${prefix}:${payload.currentTime}`;
      });
      return null;
    }

    // Build a mock player where we can fire events manually.
    const { player, mockSetState } = makeMockPlayer();
    let capturedTimeUpdateHandler: ((p: { currentTime: number; playedSeconds: number; duration: number }) => void) | null = null;
    (player.on as ReturnType<typeof vi.fn>).mockImplementation(
      (event: string, handler: (p: unknown) => void) => {
        if (event === "timeupdate") capturedTimeUpdateHandler = handler as typeof capturedTimeUpdateHandler;
        return () => undefined;
      },
    );
    void mockSetState;

    const ctx = { player, options: {} };

    const { rerender } = renderWithPlayer(<DynamicHandler prefix="v1" />, { player });

    act(() => capturedTimeUpdateHandler?.({ currentTime: 5, playedSeconds: 5, duration: 100 }));
    expect(callValue).toBe("v1:5");

    rerender(
      <PlayerContext.Provider value={ctx}>
        <DynamicHandler prefix="v2" />
      </PlayerContext.Provider>,
    );
    act(() => capturedTimeUpdateHandler?.({ currentTime: 10, playedSeconds: 10, duration: 100 }));
    expect(callValue).toBe("v2:10");
  });

  it("cleans up the listener on unmount", () => {
    const disposer = vi.fn();
    const { player, mockSetState: _ms } = makeMockPlayer();
    (player.on as ReturnType<typeof vi.fn>).mockReturnValue(disposer);

    const { unmount } = renderWithPlayer(<EventCounter eventName="ended" />, { player });
    unmount();
    expect(disposer).toHaveBeenCalled();
  });
});
