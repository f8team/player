import type { PlayerState } from "@f8team/reel-core";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, type vi } from "vitest";

import { renderWithPlayer } from "../../../test-utils/renderWithPlayer.js";
import { Quality } from "../Quality.js";

const QUALITIES: PlayerState["qualities"] = [
  { id: "0", height: 360, bitrate: 800_000, label: "360p" },
  { id: "1", height: 720, bitrate: 2_500_000, label: "720p" },
];

describe("<Quality>", () => {
  it("renders null when no qualities are available", () => {
    const { container } = renderWithPlayer(<Quality />, { initialState: { qualities: [] } });
    expect(container.firstChild).toBeNull();
  });

  it("renders a select with quality options when qualities exist", () => {
    renderWithPlayer(<Quality />, {
      initialState: { qualities: QUALITIES, activeQuality: null },
    });
    expect(screen.getByRole("button", { name: "Quality" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Quality" }));
    expect(screen.getByRole("option", { name: /360p HD/ })).toBeDefined();
    expect(screen.getByRole("option", { name: /720p HD/ })).toBeDefined();
    expect(screen.getAllByText("Auto").length).toBeGreaterThan(0);
  });

  it("renders the active quality as resolution plus an HD badge", () => {
    renderWithPlayer(<Quality />, {
      initialState: { qualities: QUALITIES, activeQuality: QUALITIES[1] },
    });
    expect(screen.getByText("720p")).toBeDefined();
    expect(screen.getByText("HD")).toBeDefined();
  });

  it("selects 'auto' when activeQuality is null", () => {
    const { container } = renderWithPlayer(<Quality />, {
      initialState: { qualities: QUALITIES, activeQuality: null },
    });
    fireEvent.click(screen.getByRole("button", { name: "Quality" }));
    expect(container.querySelector('[data-value="auto"][aria-selected="true"]')).not.toBeNull();
  });

  it("calls commands.run('hls-quality:set') when a quality is chosen", async () => {
    const { player } = renderWithPlayer(<Quality />, {
      initialState: { qualities: QUALITIES, activeQuality: null },
    });
    await userEvent.click(screen.getByRole("button", { name: "Quality" }));
    await userEvent.click(screen.getByRole("option", { name: /720p HD/ }));
    expect(player.commands.run as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      "hls-quality:set",
      expect.objectContaining({ id: "1" }),
    );
  });

  it("calls commands.run('hls-quality:setAuto') when 'Auto' is chosen", async () => {
    const { player } = renderWithPlayer(<Quality />, {
      initialState: { qualities: QUALITIES, activeQuality: QUALITIES[0] },
    });
    await userEvent.click(screen.getByRole("button", { name: "Quality" }));
    await userEvent.click(screen.getByRole("option", { name: "Auto" }));
    expect(player.commands.run as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      "hls-quality:setAuto",
    );
  });

  it("closes the listbox when clicking elsewhere inside the player", () => {
    const { container } = renderWithPlayer(
      <div data-reel="">
        <Quality />
        <button type="button">Outside inside player</button>
      </div>,
      {
        initialState: { qualities: QUALITIES, activeQuality: null },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Quality" }));
    expect(container.querySelector('[data-reel-control-popover="quality"]')).not.toBeNull();

    fireEvent.pointerDown(screen.getByRole("button", { name: "Outside inside player" }));
    expect(container.querySelector('[data-reel-control-popover="quality"]')).toBeNull();
  });
});
