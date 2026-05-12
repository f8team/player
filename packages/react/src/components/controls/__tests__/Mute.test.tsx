import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithPlayer } from "../../../test-utils/renderWithPlayer.js";
import { Mute } from "../Mute.js";

describe("<Mute>", () => {
  it("shows 'Mute' when not muted", () => {
    renderWithPlayer(<Mute />, { initialState: { muted: false } });
    const btn = screen.getByRole("button", { name: "Mute" });
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  it("shows 'Unmute' when muted", () => {
    renderWithPlayer(<Mute />, { initialState: { muted: true } });
    const btn = screen.getByRole("button", { name: "Unmute" });
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });

  it("calls player.setMuted(true) when clicking while not muted", async () => {
    const { player } = renderWithPlayer(<Mute />, { initialState: { muted: false } });
    await userEvent.click(screen.getByRole("button"));
    expect(player.setMuted).toHaveBeenCalledWith(true);
  });

  it("calls player.setMuted(false) when clicking while muted", async () => {
    const { player } = renderWithPlayer(<Mute />, { initialState: { muted: true } });
    await userEvent.click(screen.getByRole("button"));
    expect(player.setMuted).toHaveBeenCalledWith(false);
  });
});
