import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { vietnameseLabels } from "../../../i18n.js";
import { renderWithPlayer } from "../../../test-utils/renderWithPlayer.js";
import { SeekOffset } from "../SeekOffset.js";

describe("<SeekOffset>", () => {
  it("seeks forward by the configured offset", async () => {
    const { player } = renderWithPlayer(<SeekOffset seconds={10} />, {
      initialState: { currentTime: 20, duration: 100 },
    });

    await userEvent.click(screen.getByRole("button", { name: "Forward 10 seconds" }));

    expect(player.seekTo).toHaveBeenCalledWith(30);
  });

  it("clamps backward seeks at zero", async () => {
    const { player } = renderWithPlayer(<SeekOffset seconds={-10} />, {
      initialState: { currentTime: 4, duration: 100 },
    });

    await userEvent.click(screen.getByRole("button", { name: "Rewind 10 seconds" }));

    expect(player.seekTo).toHaveBeenCalledWith(0);
  });

  it("clamps forward seeks at finite duration", async () => {
    const { player } = renderWithPlayer(<SeekOffset seconds={10} />, {
      initialState: { currentTime: 96, duration: 100 },
    });

    await userEvent.click(screen.getByRole("button", { name: "Forward 10 seconds" }));

    expect(player.seekTo).toHaveBeenCalledWith(100);
  });

  it("uses localized labels", () => {
    renderWithPlayer(<SeekOffset seconds={-5} />, {
      labels: vietnameseLabels,
      initialState: { currentTime: 20, duration: 100 },
    });

    expect(screen.getByRole("button", { name: "Tua lại 5 giây" })).toBeDefined();
  });
});
