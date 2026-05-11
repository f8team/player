import { act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithPlayer } from "../../test-utils/renderWithPlayer.js";
import { Video } from "../Video.js";

describe("<Video>", () => {
  it("renders a <video> element with data-f8-player-video attribute", () => {
    const { container } = renderWithPlayer(<Video />);
    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video?.getAttribute("data-f8-player-video")).toBe("");
  });

  it("calls player.attach with the video element on mount", async () => {
    const { player } = renderWithPlayer(<Video />);
    await act(async () => undefined);
    expect(player.attach).toHaveBeenCalledWith(expect.any(HTMLVideoElement));
  });

  it("calls player.detach on unmount", async () => {
    const { player, unmount } = renderWithPlayer(<Video />);
    await act(async () => undefined);
    unmount();
    expect(player.detach).toHaveBeenCalled();
  });

  it("forwards className and style", () => {
    const { container } = renderWithPlayer(
      <Video className="my-video" style={{ width: 640 }} />,
    );
    const video = container.querySelector("video");
    expect(video?.className).toBe("my-video");
    expect(video?.style.width).toBe("640px");
  });
});
