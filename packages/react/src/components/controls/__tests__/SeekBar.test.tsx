import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithPlayer } from "../../../test-utils/renderWithPlayer.js";
import { SeekBar } from "../SeekBar.js";

describe("<SeekBar>", () => {
  it("renders with role=slider and correct aria attributes", () => {
    renderWithPlayer(<SeekBar />, { initialState: { currentTime: 10, duration: 100 } });
    const slider = screen.getByRole("slider", { name: "Seek" });
    expect(slider.getAttribute("aria-valuenow")).toBe("10");
    expect(slider.getAttribute("aria-valuemin")).toBe("0");
    expect(slider.getAttribute("aria-valuemax")).toBe("100");
  });

  it("reflects currentTime as value", () => {
    renderWithPlayer(<SeekBar />, { initialState: { currentTime: 42, duration: 180 } });
    const input = screen.getByRole("slider") as HTMLInputElement;
    expect(input.value).toBe("42");
  });

  it("calls player.seekTo with the new value on change", () => {
    const { player } = renderWithPlayer(<SeekBar />, {
      initialState: { currentTime: 0, duration: 100 },
    });
    const input = screen.getByRole("slider");
    fireEvent.change(input, { target: { value: "50" } });
    expect(player.seekTo).toHaveBeenCalledWith(50);
  });

  it("clamps aria-valuemax to 1 when duration is 0", () => {
    renderWithPlayer(<SeekBar />, { initialState: { currentTime: 0, duration: 0 } });
    const slider = screen.getByRole("slider");
    expect(slider.getAttribute("aria-valuemax")).toBe("1");
  });

  it("applies wrapperClassName to [data-f8p-seek-wrapper]", () => {
    const { container } = renderWithPlayer(<SeekBar wrapperClassName="grow-me" />, {
      initialState: { currentTime: 0, duration: 60 },
    });
    const wrap = container.querySelector("[data-f8p-seek-wrapper]");
    expect(wrap?.classList.contains("grow-me")).toBe(true);
  });
});
