import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithPlayer } from "../../../test-utils/renderWithPlayer.js";
import { Fullscreen } from "../Fullscreen.js";

describe("<Fullscreen>", () => {
  it("renders with aria-label='Fullscreen' when not in fullscreen", () => {
    renderWithPlayer(<Fullscreen />, { initialState: { fullscreen: false } });
    const btn = screen.getByRole("button", { name: "Fullscreen" });
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  it("renders with aria-label='Exit fullscreen' when in fullscreen", () => {
    renderWithPlayer(<Fullscreen />, { initialState: { fullscreen: true } });
    const btn = screen.getByRole("button", { name: "Exit fullscreen" });
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector('[data-reel-icon="compress"]')).toBeDefined();
  });

  it("calls commands.run('fullscreen:toggle') on click", async () => {
    const { player } = renderWithPlayer(<Fullscreen />, { initialState: { fullscreen: false } });
    await userEvent.click(screen.getByRole("button"));
    expect(player.commands.run).toHaveBeenCalledWith("fullscreen:toggle");
  });

  it("forwards custom children", () => {
    renderWithPlayer(
      <Fullscreen>
        <span>FS</span>
      </Fullscreen>,
      {
        initialState: { fullscreen: false },
      },
    );
    expect(screen.getByText("FS")).toBeDefined();
  });
});
