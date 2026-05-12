import type { Player, PluginHost } from "@f8/player-core";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { createTouchGesturesPlugin } from "./touch-gestures.js";

function makePlayer(overrides: { currentTime?: number; duration?: number; status?: string } = {}) {
  const { currentTime = 50, duration = 100, status = "playing" } = overrides;
  let _currentTime = currentTime;
  return {
    getState: () => ({ status, currentTime: _currentTime, duration }),
    seekTo: vi.fn().mockImplementation((t: number) => {
      _currentTime = t;
    }),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    paused: vi.fn(),
    setPlaybackRate: vi.fn(),
    setVolume: vi.fn(),
    setMuted: vi.fn(),
    setSource: vi.fn(),
    getSource: vi.fn(),
    getCurrentTime: vi.fn(),
    getDuration: vi.fn(),
    getBuffered: vi.fn(),
    subscribe: vi.fn().mockReturnValue(() => undefined),
    on: vi.fn().mockReturnValue(() => undefined),
    off: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    dispose: vi.fn(),
    use: vi.fn(),
    removePlugin: vi.fn(),
    commands: { add: vi.fn().mockReturnValue(() => undefined), run: vi.fn(), has: vi.fn() },
  } as unknown as Player;
}

function makeHost(): PluginHost {
  return {
    controls: { contribute: vi.fn().mockReturnValue(() => undefined) },
    commands: { add: vi.fn().mockReturnValue(() => undefined), run: vi.fn(), has: vi.fn() },
    store: { getState: vi.fn(), subscribe: vi.fn().mockReturnValue(() => undefined) },
    emit: vi.fn(),
  } as unknown as PluginHost;
}

function makeTouchEvent(type: "touchstart" | "touchend", x: number): TouchEvent {
  const touch = { clientX: x, clientY: 0 } as Touch;
  return new TouchEvent(type, {
    touches: type === "touchstart" ? [touch] : [],
    changedTouches: [touch],
    bubbles: true,
    cancelable: true,
  });
}

describe("createTouchGesturesPlugin", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    container.setAttribute("data-f8-player", "");
    // Give the element a bounding rect.
    container.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 300,
      height: 200,
      right: 300,
      bottom: 200,
    } as DOMRect);
    document.body.appendChild(container);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.removeChild(container);
  });

  it("has name 'touch-gestures'", () => {
    expect(createTouchGesturesPlugin().name).toBe("touch-gestures");
  });

  it("single tap on center toggles play/pause when playing", () => {
    const player = makePlayer({ status: "playing" });
    const host = makeHost();
    createTouchGesturesPlugin().setup(player, host);
    container.dispatchEvent(makeTouchEvent("touchstart", 150)); // center x=150
    container.dispatchEvent(makeTouchEvent("touchend", 150));
    vi.runAllTimers();
    expect(player.pause).toHaveBeenCalled();
  });

  it("single tap on left zone seeks back", () => {
    const player = makePlayer({ currentTime: 50 });
    createTouchGesturesPlugin({ seekStep: 10 }).setup(player, makeHost());
    container.dispatchEvent(makeTouchEvent("touchstart", 20)); // left zone (x=20, width=300, 20/300 < 0.3)
    container.dispatchEvent(makeTouchEvent("touchend", 20));
    vi.runAllTimers();
    expect(player.seekTo).toHaveBeenCalledWith(40);
  });

  it("single tap on right zone seeks forward", () => {
    const player = makePlayer({ currentTime: 50, duration: 100 });
    createTouchGesturesPlugin({ seekStep: 10 }).setup(player, makeHost());
    container.dispatchEvent(makeTouchEvent("touchstart", 280)); // right zone
    container.dispatchEvent(makeTouchEvent("touchend", 280));
    vi.runAllTimers();
    expect(player.seekTo).toHaveBeenCalledWith(60);
  });

  it("double-tap on left zone seeks back by 2x seekStep", () => {
    const player = makePlayer({ currentTime: 50 });
    createTouchGesturesPlugin({ seekStep: 10 }).setup(player, makeHost());
    container.dispatchEvent(makeTouchEvent("touchstart", 20));
    container.dispatchEvent(makeTouchEvent("touchend", 20));
    container.dispatchEvent(makeTouchEvent("touchstart", 20));
    container.dispatchEvent(makeTouchEvent("touchend", 20));
    expect(player.seekTo).toHaveBeenCalledWith(30); // 50 - 20
  });

  it("teardown removes event listeners", () => {
    const player = makePlayer();
    const teardown = createTouchGesturesPlugin().setup(player, makeHost());
    teardown?.();
    container.dispatchEvent(makeTouchEvent("touchstart", 150));
    container.dispatchEvent(makeTouchEvent("touchend", 150));
    vi.runAllTimers();
    expect(player.pause).not.toHaveBeenCalled();
  });
});
