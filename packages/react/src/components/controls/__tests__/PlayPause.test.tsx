import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithPlayer } from "../../../test-utils/renderWithPlayer.js";
import { PlayPause } from "../PlayPause.js";

describe("<PlayPause>", () => {
  it("renders with aria-label='Play' when idle", () => {
    renderWithPlayer(<PlayPause />, { initialState: { status: "idle" } });
    const btn = screen.getByRole("button", { name: "Play" });
    expect(btn).toBeDefined();
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  it("renders with aria-label='Pause' when playing", () => {
    renderWithPlayer(<PlayPause />, { initialState: { status: "playing" } });
    const btn = screen.getByRole("button", { name: "Pause" });
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });

  it("calls player.play() when clicked while paused", async () => {
    const { player } = renderWithPlayer(<PlayPause />, { initialState: { status: "idle" } });
    await userEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(player.play).toHaveBeenCalled();
  });

  it("calls player.pause() when clicked while playing", async () => {
    const { player } = renderWithPlayer(<PlayPause />, { initialState: { status: "playing" } });
    await userEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(player.pause).toHaveBeenCalled();
  });

  it("forwards custom children", () => {
    renderWithPlayer(
      <PlayPause>
        <span>GO</span>
      </PlayPause>,
    );
    expect(screen.getByText("GO")).toBeDefined();
  });

  it("forwards extra props to the button", () => {
    renderWithPlayer(<PlayPause data-custom="x" />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("data-custom")).toBe("x");
  });
});
