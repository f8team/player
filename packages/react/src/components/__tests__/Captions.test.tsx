import type { PlayerState } from "@f8team/reel-core";
import { act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithPlayer } from "../../test-utils/renderWithPlayer.js";
import { Captions } from "../Captions.js";

const TRACKS: PlayerState["source"] = {
  src: "https://cdn.example.com/video.mp4",
  tracks: [
    { srcLang: "vi", label: "Tiếng Việt", src: "https://cdn.example.com/vi.vtt", default: true },
    { srcLang: "en", label: "English", src: "https://cdn.example.com/en.vtt" },
  ],
};

describe("<Captions>", () => {
  it("renders null when source has no tracks", () => {
    const { container } = renderWithPlayer(<Captions />, { initialState: { source: null } });
    expect(container.firstChild).toBeNull();
  });

  it("renders null when source has empty tracks array", () => {
    const { container } = renderWithPlayer(<Captions />, {
      initialState: { source: { src: "x.mp4", tracks: [] } },
    });
    expect(container.firstChild).toBeNull();
  });

  it("renders a <track> per subtitle entry", () => {
    renderWithPlayer(<Captions />, { initialState: { source: TRACKS } });
    const tracks = document.querySelectorAll("track");
    expect(tracks.length).toBe(2);
    expect(tracks[0]?.getAttribute("srclang")).toBe("vi");
    expect(tracks[1]?.getAttribute("srclang")).toBe("en");
  });

  it("marks the default track", () => {
    renderWithPlayer(<Captions />, { initialState: { source: TRACKS } });
    const defaultTrack = document.querySelector("track[default]");
    expect(defaultTrack).not.toBeNull();
  });

  it("updates when source changes", () => {
    const { mockSetState } = renderWithPlayer(<Captions />, { initialState: { source: null } });
    expect(document.querySelectorAll("track").length).toBe(0);
    act(() => mockSetState({ source: TRACKS }));
    expect(document.querySelectorAll("track").length).toBe(2);
  });
});
