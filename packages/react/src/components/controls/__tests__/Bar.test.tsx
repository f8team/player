import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithPlayer } from "../../../test-utils/renderWithPlayer.js";
import { Bar } from "../Bar.js";

describe("<Bar>", () => {
  it("renders a toolbar with aria-label='Điều khiển video'", () => {
    renderWithPlayer(<Bar />);
    const toolbar = screen.getByRole("toolbar", { name: "Điều khiển video" });
    expect(toolbar).toBeDefined();
  });

  it("renders children", () => {
    renderWithPlayer(
      <Bar>
        <span data-testid="child">Hi</span>
      </Bar>,
    );
    expect(screen.getByTestId("child")).toBeDefined();
  });

  it("forwards className and data-* attributes", () => {
    renderWithPlayer(<Bar className="custom" data-custom="yes" />);
    const toolbar = screen.getByRole("toolbar");
    expect(toolbar.className).toBe("custom");
    expect(toolbar.getAttribute("data-custom")).toBe("yes");
  });
});
