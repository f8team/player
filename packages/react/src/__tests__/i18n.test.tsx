import { screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Mute } from "../components/controls/Mute.js";
import { PlayPause } from "../components/controls/PlayPause.js";
import { SeekBar } from "../components/controls/SeekBar.js";
import { Time } from "../components/controls/Time.js";
import { vietnameseLabels, defaultLabels } from "../i18n.js";
import { renderWithPlayer } from "../test-utils/renderWithPlayer.js";

describe("i18n — defaults and overrides (B1)", () => {
  it("defaults to English when no labels prop is passed", () => {
    renderWithPlayer(<PlayPause />);
    expect(screen.queryByRole("button", { name: defaultLabels.play })).toBeTruthy();
  });

  it("renders Vietnamese when vietnameseLabels preset is passed", () => {
    renderWithPlayer(<PlayPause />, { labels: vietnameseLabels });
    expect(screen.queryByRole("button", { name: vietnameseLabels.play })).toBeTruthy();
  });

  it("partial overrides fall back to default for missing keys", () => {
    renderWithPlayer(<Mute />, { labels: { mute: "Silence" } });
    // Player is unmuted by default → label should be the overridden "Silence".
    expect(screen.queryByRole("button", { name: "Silence" })).toBeTruthy();
  });

  it("SeekBar aria-label and aria-valuetext use English defaults", () => {
    renderWithPlayer(<SeekBar />, {
      initialState: { currentTime: 30, duration: 120, buffered: [] },
    });
    const slider = screen.getByRole("slider", { name: defaultLabels.seek });
    expect(slider).toBeTruthy();
    expect(slider.getAttribute("aria-valuetext")).toBe("0:30 / 2:00");
  });

  it("Time variant=duration formats via labels.timeDuration", () => {
    renderWithPlayer(<Time variant="duration" />, {
      initialState: { currentTime: 0, duration: 90 },
    });
    expect(screen.queryByLabelText(defaultLabels.timeDuration("1:30"))).toBeTruthy();
  });

  it("Time variant=duration honors Vietnamese opt-in", () => {
    renderWithPlayer(<Time variant="duration" />, {
      initialState: { currentTime: 0, duration: 90 },
      labels: vietnameseLabels,
    });
    expect(screen.queryByLabelText(vietnameseLabels.timeDuration("1:30"))).toBeTruthy();
  });

  it("SeekBar throttles seekTo while dragging (C2)", () => {
    const { player } = renderWithPlayer(<SeekBar />, {
      initialState: { currentTime: 10, duration: 100, buffered: [] },
    });
    const slider = screen.getByRole("slider");
    // Simulate pointer down then multiple change events — seekTo should NOT
    // fire until pointer up.
    fireEvent.pointerDown(slider);
    fireEvent.change(slider, { target: { value: "20" } });
    fireEvent.change(slider, { target: { value: "30" } });
    fireEvent.change(slider, { target: { value: "40" } });
    expect(player.seekTo).not.toHaveBeenCalled();

    // Release commits exactly one seekTo with the last value.
    fireEvent.pointerUp(window);
    expect(player.seekTo).toHaveBeenCalledTimes(1);
    expect(player.seekTo).toHaveBeenCalledWith(40);
  });

  it("SeekBar seeks immediately on keyboard / single change without drag (C2)", () => {
    const { player } = renderWithPlayer(<SeekBar />, {
      initialState: { currentTime: 10, duration: 100, buffered: [] },
    });
    const slider = screen.getByRole("slider");
    // No pointerDown → handled as keyboard input → seek fires immediately.
    fireEvent.change(slider, { target: { value: "55" } });
    expect(player.seekTo).toHaveBeenCalledWith(55);
  });

  it("SeekBar renders buffered overlay width relative to duration (B4)", () => {
    renderWithPlayer(<SeekBar />, {
      initialState: {
        currentTime: 0,
        duration: 100,
        buffered: [
          { start: 0, end: 40 },
          { start: 50, end: 60 },
        ],
      },
    });
    const buffered = document.querySelector<HTMLDivElement>("[data-reel-seek-buffered]");
    expect(buffered).toBeTruthy();
    // Furthest end is 60 → 60% width.
    expect(buffered?.style.width).toBe("60%");
  });
});
