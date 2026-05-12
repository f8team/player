import { act, createEvent, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithPlayer } from "../../../test-utils/renderWithPlayer.js";
import { SeekBar } from "../SeekBar.js";

const SAMPLE_CUES = [
  { start: 0, end: 10, src: "https://cdn/sprite.jpg", x: 0, y: 0, w: 160, h: 90 },
  { start: 10, end: 20, src: "https://cdn/sprite.jpg", x: 160, y: 0, w: 160, h: 90 },
];

/**
 * jsdom's PointerEvent constructor drops `clientX` on the floor when
 * passed via `fireEvent.pointerMove(el, { clientX })`. Construct the
 * event ourselves and patch `clientX` directly so React's `onPointerMove`
 * sees the real value.
 */
function dispatchPointerMove(el: HTMLElement, clientX: number): void {
  const ev = createEvent.pointerMove(el, { bubbles: true });
  Object.defineProperty(ev, "clientX", { configurable: true, value: clientX });
  Object.defineProperty(ev, "pageX", { configurable: true, value: clientX });
  fireEvent(el, ev);
}

describe("<SeekBar>", () => {
  it("renders with role=slider and correct aria attributes", () => {
    renderWithPlayer(<SeekBar />, { initialState: { currentTime: 10, duration: 100 } });
    const slider = screen.getByRole("slider", { name: "Seek" });
    expect(slider.getAttribute("aria-valuenow")).toBe("10");
    expect(slider.getAttribute("aria-valuemin")).toBe("0");
    expect(slider.getAttribute("aria-valuemax")).toBe("100");
  });

  it("reflects currentTime as value", () => {
    renderWithPlayer(<SeekBar />, { initialState: { currentTime: 42, duration: 180 } });
    const input = screen.getByRole("slider") as HTMLInputElement;
    expect(input.value).toBe("42");
  });

  it("calls player.seekTo with the new value on change", () => {
    const { player } = renderWithPlayer(<SeekBar />, {
      initialState: { currentTime: 0, duration: 100 },
    });
    const input = screen.getByRole("slider");
    fireEvent.change(input, { target: { value: "50" } });
    expect(player.seekTo).toHaveBeenCalledWith(50);
  });

  it("clamps aria-valuemax to 1 when duration is 0", () => {
    renderWithPlayer(<SeekBar />, { initialState: { currentTime: 0, duration: 0 } });
    const slider = screen.getByRole("slider");
    expect(slider.getAttribute("aria-valuemax")).toBe("1");
  });

  it("applies wrapperClassName to [data-f8p-seek-wrapper]", () => {
    const { container } = renderWithPlayer(<SeekBar wrapperClassName="grow-me" />, {
      initialState: { currentTime: 0, duration: 60 },
    });
    const wrap = container.querySelector("[data-f8p-seek-wrapper]");
    expect(wrap?.classList.contains("grow-me")).toBe(true);
  });

  describe("thumbnail hover preview", () => {
    it("does not render a thumbnail tile when no cues are loaded", () => {
      const { container } = renderWithPlayer(<SeekBar />, {
        initialState: { currentTime: 0, duration: 100 },
      });
      const wrap = container.querySelector("[data-f8p-seek-wrapper]") as HTMLElement;
      dispatchPointerMove(wrap, 50);
      expect(container.querySelector("[data-f8p-seek-thumbnail]")).toBeNull();
    });

    function stubRect(el: HTMLElement, width: number): void {
      // jsdom returns 0 for getBoundingClientRect — patch this element so
      // pointer-position math has a real width to work with.
      Object.defineProperty(el, "getBoundingClientRect", {
        configurable: true,
        value: () =>
          ({ left: 0, width, top: 0, right: width, bottom: 18, height: 18 }) as DOMRect,
      });
    }

    it("renders a thumbnail tile after the plugin emits thumbnails:ready and the user hovers", () => {
      const { container, mockEmit, player } = renderWithPlayer(<SeekBar />, {
        initialState: { currentTime: 0, duration: 20 },
      });

      // Sanity: the SeekBar should have subscribed to thumbnails events
      // through `player.on(...)` during its mount effect.
      const onMock = player.on as unknown as { mock: { calls: unknown[][] } };
      const subscribedEvents = onMock.mock.calls.map((c) => c[0]);
      expect(subscribedEvents).toContain("thumbnails:ready");

      // Simulate the plugin firing `thumbnails:ready` with the parsed cues.
      act(() => {
        mockEmit("thumbnails:ready", { cues: SAMPLE_CUES });
      });

      const wrap = container.querySelector("[data-f8p-seek-wrapper]") as HTMLElement;
      stubRect(wrap, 200);

      // Hover at x=50px (50 / 200 * duration=20 → t=5s, cue 0).
      act(() => {
        dispatchPointerMove(wrap, 50);
      });
      const tile = container.querySelector("[data-f8p-seek-thumbnail]");
      expect(tile).not.toBeNull();
      expect((tile as HTMLElement).style.backgroundImage).toContain("https://cdn/sprite.jpg");

      // Pointer leaving hides the tile.
      act(() => {
        fireEvent.pointerLeave(wrap);
      });
      expect(container.querySelector("[data-f8p-seek-thumbnail]")).toBeNull();
    });

    it("clears thumbnails when the plugin emits thumbnails:cleared", () => {
      const { container, mockEmit } = renderWithPlayer(<SeekBar />, {
        initialState: { currentTime: 0, duration: 20 },
      });
      act(() => {
        mockEmit("thumbnails:ready", { cues: SAMPLE_CUES });
      });

      const wrap = container.querySelector("[data-f8p-seek-wrapper]") as HTMLElement;
      stubRect(wrap, 200);
      act(() => {
        dispatchPointerMove(wrap, 50);
      });
      expect(container.querySelector("[data-f8p-seek-thumbnail]")).not.toBeNull();

      act(() => {
        mockEmit("thumbnails:cleared");
      });
      // The component drops the cues; the next render rebuilds without a tile.
      act(() => {
        dispatchPointerMove(wrap, 50);
      });
      expect(container.querySelector("[data-f8p-seek-thumbnail]")).toBeNull();
    });
  });
});
