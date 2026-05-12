import type { PlayerState } from "@f8/player-core";
import { screen } from "@testing-library/react";
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
    expect(screen.getByRole("combobox", { name: "Quality" })).toBeDefined();
    expect(screen.getByText("360p HD")).toBeDefined();
    expect(screen.getByText("720p HD")).toBeDefined();
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
    renderWithPlayer(<Quality />, {
      initialState: { qualities: QUALITIES, activeQuality: null },
    });
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("auto");
  });

  it("calls commands.run('hls-quality:set') when a quality is chosen", async () => {
    const { player } = renderWithPlayer(<Quality />, {
      initialState: { qualities: QUALITIES, activeQuality: null },
    });
    const select = screen.getByRole("combobox");
    await userEvent.selectOptions(select, "1");
    expect(player.commands.run as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      "hls-quality:set",
      expect.objectContaining({ id: "1" }),
    );
  });

  it("calls commands.run('hls-quality:setAuto') when 'Auto' is chosen", async () => {
    const { player } = renderWithPlayer(<Quality />, {
      initialState: { qualities: QUALITIES, activeQuality: QUALITIES[0] },
    });
    const select = screen.getByRole("combobox");
    await userEvent.selectOptions(select, "auto");
    expect(player.commands.run as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      "hls-quality:setAuto",
    );
  });
});
