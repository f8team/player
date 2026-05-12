import type { Player, PluginHost } from "@f8/player-core";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { createStoryGesturesPlugin } from "./story-gestures.js";

function makePlayer(status: "playing" | "paused" | "idle" = "playing") {
  return {
    getState: () => ({ status, currentTime: 30, duration: 100 }),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    paused: vi.fn(),
    seekTo: vi.fn(),
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

describe("createStoryGesturesPlugin", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    container.setAttribute("data-f8-player", "");
    container.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      width: 400,
      top: 0,
      height: 700,
    } as DOMRect);
    document.body.appendChild(container);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.removeChild(container);
  });

  it("has name 'story-gestures'", () => {
    expect(createStoryGesturesPlugin().name).toBe("story-gestures");
  });

  it("tap left calls onPrev and emits story-gestures:prev", () => {
    const onPrev = vi.fn();
    const host = makeHost();
    createStoryGesturesPlugin({ onPrev }).setup(makePlayer(), host);
    container.dispatchEvent(makeTouchEvent("touchstart", 20)); // left zone
    container.dispatchEvent(makeTouchEvent("touchend", 20));
    vi.runAllTimers();
    expect(onPrev).toHaveBeenCalled();
    expect(host.emit).toHaveBeenCalledWith("story-gestures:prev", undefined);
  });

  it("tap right calls onNext", () => {
    const onNext = vi.fn();
    createStoryGesturesPlugin({ onNext }).setup(makePlayer(), makeHost());
    container.dispatchEvent(makeTouchEvent("touchstart", 380)); // right zone
    container.dispatchEvent(makeTouchEvent("touchend", 380));
    vi.runAllTimers();
    expect(onNext).toHaveBeenCalled();
  });

  it("tap center toggles pause when playing", () => {
    const player = makePlayer("playing");
    createStoryGesturesPlugin().setup(player, makeHost());
    container.dispatchEvent(makeTouchEvent("touchstart", 200)); // center
    container.dispatchEvent(makeTouchEvent("touchend", 200));
    vi.runAllTimers();
    expect(player.pause).toHaveBeenCalled();
  });

  it("hold pauses and calls onHold(start)", () => {
    const onHold = vi.fn();
    const player = makePlayer("playing");
    const host = makeHost();
    createStoryGesturesPlugin({ onHold, holdDuration: 300 }).setup(player, host);
    container.dispatchEvent(makeTouchEvent("touchstart", 200));
    vi.advanceTimersByTime(350); // trigger hold
    expect(player.pause).toHaveBeenCalled();
    expect(onHold).toHaveBeenCalledWith("start");
    expect(host.emit).toHaveBeenCalledWith("story-gestures:hold", { type: "start" });
  });

  it("release after hold plays and calls onHold(end)", () => {
    const onHold = vi.fn();
    const player = makePlayer("playing");
    createStoryGesturesPlugin({ onHold, holdDuration: 300 }).setup(player, makeHost());
    container.dispatchEvent(makeTouchEvent("touchstart", 200));
    vi.advanceTimersByTime(350);
    container.dispatchEvent(makeTouchEvent("touchend", 200));
    expect(player.play).toHaveBeenCalled();
    expect(onHold).toHaveBeenCalledWith("end");
  });

  it("teardown removes listeners", () => {
    const onPrev = vi.fn();
    const teardown = createStoryGesturesPlugin({ onPrev }).setup(makePlayer(), makeHost());
    teardown?.();
    container.dispatchEvent(makeTouchEvent("touchstart", 20));
    container.dispatchEvent(makeTouchEvent("touchend", 20));
    vi.runAllTimers();
    expect(onPrev).not.toHaveBeenCalled();
  });
});
