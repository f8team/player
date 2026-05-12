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
} as const;

describe("<Controls.Captions>", () => {
  it("renders nothing when there are no tracks on the source", () => {
    const { container } = renderWithPlayer(<Captions />, {
      initialState: { source: { src: "video.m3u8" } },
    });
    expect(container.querySelector('[data-f8-player-control="captions"]')).toBeNull();
  });

  it("renders a dropdown with an 'off' option plus one per track", () => {
    renderWithPlayer(<Captions />, { initialState: { source: { ...SOURCE_WITH_TRACKS } } });
    const select = screen.getByLabelText("Captions") as HTMLSelectElement;
    expect(select).not.toBeNull();
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).toEqual(["__off__", "vi", "en"]);
  });

  it("defaults the dropdown to the track flagged as default", () => {
    renderWithPlayer(<Captions />, { initialState: { source: { ...SOURCE_WITH_TRACKS } } });
    const select = screen.getByLabelText("Captions") as HTMLSelectElement;
    expect(select.value).toBe("vi");
  });

  it("runs subtitles:setLang when the user picks a language", () => {
    const { player } = renderWithPlayer(<Captions />, {
      initialState: { source: { ...SOURCE_WITH_TRACKS } },
    });
    const select = screen.getByLabelText("Captions") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "en" } });
    expect(player.commands.run).toHaveBeenCalledWith("subtitles:setLang", "en");
  });

  it("runs subtitles:off when the user picks the off option", () => {
    const { player } = renderWithPlayer(<Captions />, {
      initialState: { source: { ...SOURCE_WITH_TRACKS } },
    });
    const select = screen.getByLabelText("Captions") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "__off__" } });
    expect(player.commands.run).toHaveBeenCalledWith("subtitles:off");
  });

  it("syncs its value from subtitles:changed events fired by the plugin", () => {
    const { container, mockEmit } = renderWithPlayer(<Captions />, {
      initialState: { source: { ...SOURCE_WITH_TRACKS } },
    });
    const select = screen.getByLabelText("Captions") as HTMLSelectElement;
    expect(select.value).toBe("vi");

    act(() => {
      mockEmit("subtitles:changed", [
        { lang: "vi", label: "Tiếng Việt", mode: "hidden" },
        { lang: "en", label: "English", mode: "showing" },
      ]);
    });
    expect(select.value).toBe("en");

    act(() => {
      mockEmit("subtitles:changed", [
        { lang: "vi", label: "Tiếng Việt", mode: "hidden" },
        { lang: "en", label: "English", mode: "hidden" },
      ]);
    });
    expect(select.value).toBe("__off__");

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
