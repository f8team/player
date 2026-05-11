import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithPlayer } from "../../../test-utils/renderWithPlayer.js";
import { Fullscreen } from "../Fullscreen.js";

describe("<Fullscreen>", () => {
  it("renders with aria-label='Toàn màn hình' when not in fullscreen", () => {
    renderWithPlayer(<Fullscreen />, { initialState: { fullscreen: false } });
    const btn = screen.getByRole("button", { name: "Toàn màn hình" });
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  it("renders with aria-label='Thoát toàn màn hình' when in fullscreen", () => {
    renderWithPlayer(<Fullscreen />, { initialState: { fullscreen: true } });
    const btn = screen.getByRole("button", { name: "Thoát toàn màn hình" });
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });

  it("calls commands.run('fullscreen:toggle') on click", async () => {
    const { player } = renderWithPlayer(<Fullscreen />, { initialState: { fullscreen: false } });
    await userEvent.click(screen.getByRole("button"));
    expect(player.commands.run).toHaveBeenCalledWith("fullscreen:toggle");
  });

  it("forwards custom children", () => {
    renderWithPlayer(<Fullscreen><span>FS</span></Fullscreen>, {
      initialState: { fullscreen: false },
    });
    expect(screen.getByText("FS")).toBeDefined();
  });
});
