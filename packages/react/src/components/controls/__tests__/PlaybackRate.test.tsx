import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithPlayer } from "../../../test-utils/renderWithPlayer.js";
import { PlaybackRate } from "../PlaybackRate.js";

describe("<PlaybackRate>", () => {
  it("renders a select with aria-label='Tốc độ phát'", () => {
    renderWithPlayer(<PlaybackRate />, { initialState: { playbackRate: 1 } });
    expect(screen.getByRole("combobox", { name: "Tốc độ phát" })).toBeDefined();
  });

  it("shows 'Bình thường' for rate 1", () => {
    renderWithPlayer(<PlaybackRate />, { initialState: { playbackRate: 1 } });
    expect(
      (screen.getByRole("combobox") as HTMLSelectElement).value,
    ).toBe("1");
    expect(screen.getByText("Bình thường")).toBeDefined();
  });

  it("calls player.setPlaybackRate on change", async () => {
    const { player } = renderWithPlayer(<PlaybackRate />, { initialState: { playbackRate: 1 } });
    const select = screen.getByRole("combobox");
    await userEvent.selectOptions(select, "1.5");
    expect(player.setPlaybackRate).toHaveBeenCalledWith(1.5);
  });

  it("supports custom rates prop", () => {
    renderWithPlayer(<PlaybackRate rates={[1, 2]} />, { initialState: { playbackRate: 1 } });
    expect(screen.getAllByRole("option").length).toBe(2);
  });
});
