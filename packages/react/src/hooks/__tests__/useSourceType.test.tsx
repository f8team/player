import { act, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithPlayer } from "../../test-utils/renderWithPlayer.js";
import { useSourceType } from "../useSourceType.js";

function SourceTypeDisplay(): JSX.Element {
  const t = useSourceType();
  return <div data-testid="type">{t ?? "null"}</div>;
}

describe("useSourceType", () => {
  it("returns null when no source is loaded", () => {
    renderWithPlayer(<SourceTypeDisplay />, { initialState: { source: null } });
    expect(screen.getByTestId("type").textContent).toBe("null");
  });

  it("detects HLS source", () => {
    const { mockSetState } = renderWithPlayer(<SourceTypeDisplay />);
    act(() => mockSetState({ source: { src: "https://example.com/video.m3u8", tracks: [] } }));
    expect(screen.getByTestId("type").textContent).toBe("hls");
  });

  it("detects YouTube source", () => {
    const { mockSetState } = renderWithPlayer(<SourceTypeDisplay />);
    act(() =>
      mockSetState({ source: { src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", tracks: [] } }),
    );
    expect(screen.getByTestId("type").textContent).toBe("youtube");
  });

  it("detects MP4 source", () => {
    const { mockSetState } = renderWithPlayer(<SourceTypeDisplay />);
    act(() => mockSetState({ source: { src: "https://example.com/video.mp4", tracks: [] } }));
    expect(screen.getByTestId("type").textContent).toBe("mp4");
  });

  it("updates when source changes from native to youtube", () => {
    const { mockSetState } = renderWithPlayer(<SourceTypeDisplay />, {
      initialState: { source: { src: "https://example.com/video.mp4", tracks: [] } },
    });
    expect(screen.getByTestId("type").textContent).toBe("mp4");
    act(() =>
      mockSetState({ source: { src: "https://youtu.be/dQw4w9WgXcQ", tracks: [] } }),
    );
    expect(screen.getByTestId("type").textContent).toBe("youtube");
  });
});
