/**
 * `<Player.LightOverlay />` — Phase 4 (T4.1).
 *
 * Replaces the consumer-side `LightOverlay` in f8-ui.
 */
import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LightOverlay } from "../components/LightOverlay.js";
import { vietnameseLabels } from "../i18n.js";
import { renderWithPlayer } from "../test-utils/renderWithPlayer.js";

describe("Player.LightOverlay — renders poster when posterUrl is provided (T4.1)", () => {
  it("renders an <img> with the given posterUrl as src", () => {
    const { container } = renderWithPlayer(<LightOverlay posterUrl="https://cdn/thumb.jpg" />);
    const img = container.querySelector<HTMLImageElement>("[data-f8p-light-poster]");
    expect(img).toBeTruthy();
    expect(img?.getAttribute("src")).toBe("https://cdn/thumb.jpg");
    expect(img?.getAttribute("alt")).toBe("");
  });
});

describe("Player.LightOverlay — calls onDismiss + player.play() on click (T4.1)", () => {
  it("calls onDismiss + player.play() when the overlay is clicked", () => {
    const onDismiss = vi.fn();
    const { container, player } = renderWithPlayer(
      <LightOverlay posterUrl="https://cdn/a.jpg" onDismiss={onDismiss} />,
    );
    const overlay = container.querySelector<HTMLDivElement>("[data-f8p-light-overlay]");
    expect(overlay).toBeTruthy();
    fireEvent.click(overlay!);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(player.play).toHaveBeenCalledTimes(1);
  });

  it("skips autoplay when autoPlayOnDismiss=false", () => {
    const onDismiss = vi.fn();
    const { container, player } = renderWithPlayer(
      <LightOverlay
        posterUrl="https://cdn/a.jpg"
        onDismiss={onDismiss}
        autoPlayOnDismiss={false}
      />,
    );
    fireEvent.click(container.querySelector("[data-f8p-light-overlay]")!);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(player.play).not.toHaveBeenCalled();
  });
});

describe("Player.LightOverlay — renders custom posterUrl unchanged (T4.1)", () => {
  it("renders a custom posterUrl unchanged", () => {
    const { container } = renderWithPlayer(
      <LightOverlay posterUrl="https://example.com/custom.png" />,
    );
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "https://example.com/custom.png",
    );
  });
});

describe("Player.LightOverlay — no-poster fallback (T4.1)", () => {
  it("renders the big-play button even when posterUrl is undefined", () => {
    const { container } = renderWithPlayer(<LightOverlay />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[data-f8p-light-play-button]")).toBeTruthy();
  });

  it("uses localized aria-label from useLabels() (Vietnamese preset)", () => {
    const { container } = renderWithPlayer(<LightOverlay />, {
      labels: vietnameseLabels,
    });
    const btn = container.querySelector("[data-f8p-light-play-button]");
    expect(btn?.getAttribute("aria-label")).toBe("Phát video");
  });
});
