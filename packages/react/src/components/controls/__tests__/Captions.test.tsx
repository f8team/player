import { act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithPlayer } from "../../../test-utils/renderWithPlayer.js";
import { Captions } from "../Captions.js";

const SOURCE_WITH_TRACKS = {
  src: "video.m3u8",
  tracks: [
    { src: "vi.vtt", srcLang: "vi", label: "Tiếng Việt", default: true },
    { src: "en.vtt", srcLang: "en", label: "English" },
  ],
};

describe("<Controls.Captions>", () => {
  it("renders nothing when there are no tracks on the source", () => {
    const { container } = renderWithPlayer(<Captions />, {
      initialState: { source: { src: "video.m3u8" } },
    });
    expect(container.querySelector('[data-f8-player-control="captions"]')).toBeNull();
  });

  it("renders a dropdown with an 'off' option plus one per track", () => {
    const { container } = renderWithPlayer(<Captions />, {
      initialState: { source: { ...SOURCE_WITH_TRACKS } },
    });
    fireEvent.click(screen.getByRole("button", { name: "Captions" }));
    const optionValues = Array.from(
      container.querySelectorAll<HTMLElement>('[data-f8p-control-popover="captions"] [data-value]'),
    ).map((o) => o.dataset.value);
    expect(optionValues).toEqual(["__off__", "vi", "en"]);
  });

  it("defaults the dropdown to the track flagged as default", () => {
    const { container } = renderWithPlayer(<Captions />, {
      initialState: { source: { ...SOURCE_WITH_TRACKS } },
    });
    fireEvent.click(screen.getByRole("button", { name: "Captions" }));
    const selected = container.querySelector('[data-value="vi"][aria-selected="true"]');
    expect(selected).not.toBeNull();
  });

  it("runs subtitles:setLang when the user picks a language", () => {
    const { player } = renderWithPlayer(<Captions />, {
      initialState: { source: { ...SOURCE_WITH_TRACKS } },
    });
    fireEvent.click(screen.getByRole("button", { name: "Captions" }));
    fireEvent.click(screen.getByRole("option", { name: "English" }));
    expect(player.commands.run).toHaveBeenCalledWith("subtitles:setLang", "en");
  });

  it("runs subtitles:off when the user picks the off option", () => {
    const { player } = renderWithPlayer(<Captions />, {
      initialState: { source: { ...SOURCE_WITH_TRACKS } },
    });
    fireEvent.click(screen.getByRole("button", { name: "Captions" }));
    fireEvent.click(screen.getByRole("option", { name: "Off" }));
    expect(player.commands.run).toHaveBeenCalledWith("subtitles:off");
  });

  it("syncs its value from subtitles:changed events fired by the plugin", () => {
    const { container, mockEmit } = renderWithPlayer(<Captions />, {
      initialState: { source: { ...SOURCE_WITH_TRACKS } },
    });
    expect(screen.getByText("VI")).toBeDefined();

    act(() => {
      mockEmit("subtitles:changed", [
        { lang: "vi", label: "Tiếng Việt", mode: "hidden" },
        { lang: "en", label: "English", mode: "showing" },
      ]);
    });
    expect(screen.getByText("EN")).toBeDefined();

    act(() => {
      mockEmit("subtitles:changed", [
        { lang: "vi", label: "Tiếng Việt", mode: "hidden" },
        { lang: "en", label: "English", mode: "hidden" },
      ]);
    });
    expect(screen.getByText("CC")).toBeDefined();

    // Host-level element should expose the active-state attribute flip.
    const host = container.querySelector('[data-f8-player-control="captions"]');
    expect(host?.hasAttribute("data-f8-player-captions-active")).toBe(false);
  });

  it("respects the `hidden` prop and renders nothing", () => {
    const { container } = renderWithPlayer(<Captions hidden />, {
      initialState: { source: { ...SOURCE_WITH_TRACKS } },
    });
    expect(container.querySelector('[data-f8-player-control="captions"]')).toBeNull();
  });
});
