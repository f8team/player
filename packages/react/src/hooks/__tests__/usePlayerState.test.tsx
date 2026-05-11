import { act, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithPlayer } from "../../test-utils/renderWithPlayer.js";
import { usePlayerState } from "../usePlayerState.js";

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

  it("throws outside PlayerContext", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("@testing-library/react").render(<StatusDisplay />),
    ).toThrow(/usePlayer\* hooks must be used inside <Player.Root>/);
    spy.mockRestore();
  });
});
