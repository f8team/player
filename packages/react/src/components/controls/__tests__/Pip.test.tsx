import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

import { renderWithPlayer } from "../../../test-utils/renderWithPlayer.js";
import { Pip } from "../Pip.js";

// jsdom does not implement PiP; enable it so the component renders.
const originalEnabled = Object.getOwnPropertyDescriptor(
  Document.prototype,
  "pictureInPictureEnabled",
);
beforeAll(() => {
  Object.defineProperty(document, "pictureInPictureEnabled", {
    configurable: true,
    value: true,
  });
});
afterAll(() => {
  if (originalEnabled) {
    Object.defineProperty(document, "pictureInPictureEnabled", originalEnabled);
  } else {
    delete (document as unknown as Record<string, unknown>)["pictureInPictureEnabled"];
  }
});

describe("<Pip>", () => {
  it("renders a PiP toggle button with correct aria-label when not in PiP", () => {
    renderWithPlayer(<Pip />, { initialState: { pip: false } });
    const btn = screen.getByRole("button", { name: "Hình trong hình" });
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  it("shows 'Thoát chế độ hình trong hình' when PiP is active", () => {
    renderWithPlayer(<Pip />, { initialState: { pip: true } });
    const btn = screen.getByRole("button", { name: "Thoát chế độ hình trong hình" });
    expect(btn.getAttribute("aria-pressed")).toBe("true");
  });

  it("calls commands.run('pip:toggle') on click", async () => {
    const { player } = renderWithPlayer(<Pip />, { initialState: { pip: false } });
    await userEvent.click(screen.getByRole("button"));
    expect(player.commands.run).toHaveBeenCalledWith("pip:toggle");
  });

  it("forwards custom children", () => {
    renderWithPlayer(
      <Pip>
        <span>PIP</span>
      </Pip>,
      { initialState: { pip: false } },
    );
    expect(screen.getByText("PIP")).toBeDefined();
  });
});
