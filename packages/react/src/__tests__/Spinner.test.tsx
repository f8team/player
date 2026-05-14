/**
 * `<Player.Spinner />` — Phase 4 (T4.1).
 *
 * Replaces the boilerplate `CenterPlaybackSpinner` each consumer used to write.
 */
import { act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Spinner } from "../components/Spinner.js";
import { vietnameseLabels } from "../i18n.js";
import { renderWithPlayer } from "../test-utils/renderWithPlayer.js";

describe("Player.Spinner — hidden when idle (T4.1)", () => {
  it("renders nothing when neither buffering nor qualityswitch is active", () => {
    const { container } = renderWithPlayer(<Spinner />);
    expect(container.querySelector("[data-reel-center-spinner]")).toBeNull();
  });
});

describe("Player.Spinner — visible on buffering (T4.1)", () => {
  it("renders the spinner when the player emits buffering=true", () => {
    const { mockEmit, container } = renderWithPlayer(<Spinner />);
    act(() => mockEmit("buffering", { isBuffering: true }));
    expect(container.querySelector("[data-reel-center-spinner]")).toBeTruthy();
    expect(container.querySelector('[role="status"]')).toBeTruthy();
    expect(container.querySelector('[aria-live="polite"]')).toBeTruthy();
  });
});

describe("Player.Spinner — visible on qualityswitch (T4.1)", () => {
  it("renders the spinner when the player emits qualityswitch active=true", () => {
    const { mockEmit, container } = renderWithPlayer(<Spinner />);
    act(() => mockEmit("qualityswitch", { active: true }));
    expect(container.querySelector("[data-reel-center-spinner]")).toBeTruthy();
  });
});

describe("Player.Spinner — aria-label depends on which event is active (T4.1)", () => {
  it("uses bufferingPlayback label when only buffering is active (Vietnamese)", () => {
    const { mockEmit, container } = renderWithPlayer(<Spinner />, {
      labels: vietnameseLabels,
    });
    act(() => mockEmit("buffering", { isBuffering: true }));
    const el = container.querySelector("[data-reel-center-spinner]");
    expect(el?.getAttribute("aria-label")).toBe("Đang tải để tiếp tục phát");
  });

  it("uses bufferingGeneric label when BOTH buffering and qualityswitch are active", () => {
    const { mockEmit, container } = renderWithPlayer(<Spinner />, {
      labels: vietnameseLabels,
    });
    act(() => {
      mockEmit("qualityswitch", { active: true });
      mockEmit("buffering", { isBuffering: true });
    });
    const el = container.querySelector("[data-reel-center-spinner]");
    expect(el?.getAttribute("aria-label")).toBe("Đang xử lý video");
  });
});

describe("Player.Spinner — clears when both events go idle (T4.1)", () => {
  it("hides the spinner after buffering=false + qualityswitch=false", () => {
    const { mockEmit, container } = renderWithPlayer(<Spinner />);
    act(() => mockEmit("buffering", { isBuffering: true }));
    expect(container.querySelector("[data-reel-center-spinner]")).toBeTruthy();
    act(() => mockEmit("buffering", { isBuffering: false }));
    expect(container.querySelector("[data-reel-center-spinner]")).toBeNull();
  });
});
