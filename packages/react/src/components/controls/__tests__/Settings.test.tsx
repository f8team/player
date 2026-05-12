import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithPlayer } from "../../../test-utils/renderWithPlayer.js";
import { Settings } from "../Settings.js";

describe("<Settings>", () => {
  it("renders a gear-backed playback settings select", () => {
    renderWithPlayer(<Settings />, { initialState: { playbackRate: 1 } });
    expect(screen.getByRole("combobox", { name: "Settings" })).toBeDefined();
    expect(document.querySelector('[data-f8-player-icon="settings"]')).toBeDefined();
  });

  it("updates the playback rate when a rate is selected", async () => {
    const { player } = renderWithPlayer(<Settings />, { initialState: { playbackRate: 1 } });

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Settings" }), "1.5");

    expect(player.setPlaybackRate).toHaveBeenCalledWith(1.5);
  });
});
