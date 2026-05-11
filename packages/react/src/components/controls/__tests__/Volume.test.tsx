import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithPlayer } from "../../../test-utils/renderWithPlayer.js";
import { Volume } from "../Volume.js";

describe("<Volume>", () => {
  it("renders role=slider with aria-label='Âm lượng'", () => {
    renderWithPlayer(<Volume />, { initialState: { volume: 0.8 } });
    const slider = screen.getByRole("slider", { name: "Âm lượng" });
    expect(slider.getAttribute("aria-valuenow")).toBe("0.8");
  });

  it("calls player.setVolume with new value on change", () => {
    const { player } = renderWithPlayer(<Volume />, { initialState: { volume: 1 } });
    const input = screen.getByRole("slider", { name: "Âm lượng" });
    fireEvent.change(input, { target: { value: "0.5" } });
    expect(player.setVolume).toHaveBeenCalledWith(0.5);
  });
});
