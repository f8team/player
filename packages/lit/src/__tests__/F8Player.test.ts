/**
 * Tests for the `<f8-player>` custom element.
 *
 * `@f8/player-core`'s `createPlayer` is mocked so we don't need a real HLS
 * source or video element behavior. We additionally capture the event
 * handlers registered through `player.on(...)` so we can fire core events
 * synchronously and assert the `CustomEvent` re-emission.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defineF8Player, type F8PlayerElement } from "../F8Player.js";

// ── Mock the core ───────────────────────────────────────────────────────────

type Handler = (payload: unknown) => void;

const eventHandlers = vi.hoisted(() => new Map<string, Set<Handler>>());

const mockPlayer = vi.hoisted(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  paused: vi.fn().mockReturnValue(true),
  seekTo: vi.fn(),
  getCurrentTime: vi.fn().mockReturnValue(0),
  getDuration: vi.fn().mockReturnValue(0),
  setSource: vi.fn(),
  setPlaybackRate: vi.fn(),
  setVolume: vi.fn(),
  setMuted: vi.fn(),
  attach: vi.fn().mockResolvedValue(undefined),
  detach: vi.fn(),
  dispose: vi.fn(),
  subscribe: vi.fn().mockReturnValue(() => undefined),
  on: vi.fn(),
  off: vi.fn(),
  use: vi.fn(),
  removePlugin: vi.fn(),
  getState: vi.fn(),
  getBuffered: vi.fn().mockReturnValue([]),
  getSource: vi.fn().mockReturnValue(null),
  commands: { add: vi.fn(), run: vi.fn(), has: vi.fn() },
}));

const defaultState = vi.hoisted(() => ({
  status: "paused",
  source: null,
  currentTime: 0,
  duration: 0,
  buffered: [],
  playbackRate: 1,
  volume: 1,
  muted: false,
  videoWidth: 0,
  videoHeight: 0,
  pip: false,
  fullscreen: false,
  qualities: [],
  activeQuality: null,
  error: null,
}));

vi.mock("@f8/player-core", () => ({
  createPlayer: vi.fn(() => mockPlayer),
  formatTime: (seconds: number) => {
    const safe = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safe / 60);
    const rest = String(safe % 60).padStart(2, "0");
    return `${minutes}:${rest}`;
  },
}));

// Wire `player.on(event, handler)` to capture handlers so tests can fire
// events synchronously via `fireCoreEvent(name, payload)`.
mockPlayer.on.mockImplementation((event: string, handler: Handler) => {
  let set = eventHandlers.get(event);
  if (!set) {
    set = new Set();
    eventHandlers.set(event, set);
  }
  set.add(handler);
  return () => set!.delete(handler);
});

function fireCoreEvent(event: string, payload: unknown = undefined): void {
  const set = eventHandlers.get(event);
  if (!set) return;
  for (const h of set) h(payload);
}

// Register `<f8-player>` once. defineF8Player is idempotent so this is safe.
defineF8Player();

// ── Helpers ────────────────────────────────────────────────────────────────

async function mount(options: unknown = {}): Promise<F8PlayerElement> {
  const el = document.createElement("f8-player") as F8PlayerElement;
  el.options = options as F8PlayerElement["options"];
  document.body.appendChild(el);
  // Wait for Lit's first update.
  await el.updateComplete;
  return el;
}

beforeEach(() => {
  vi.clearAllMocks();
  eventHandlers.clear();
  mockPlayer.on.mockImplementation((event: string, handler: Handler) => {
    let set = eventHandlers.get(event);
    if (!set) {
      set = new Set();
      eventHandlers.set(event, set);
    }
    set.add(handler);
    return () => set!.delete(handler);
  });
  mockPlayer.attach.mockResolvedValue(undefined);
  mockPlayer.play.mockResolvedValue(undefined);
  mockPlayer.paused.mockReturnValue(true);
  mockPlayer.getCurrentTime.mockReturnValue(0);
  mockPlayer.getState.mockReturnValue({ ...defaultState });
});

afterEach(() => {
  for (const el of Array.from(document.body.querySelectorAll("f8-player"))) {
    el.remove();
  }
});

// ── defineF8Player ────────────────────────────────────────────────────────

describe("defineF8Player", () => {
  it("registers <f8-player> on customElements", () => {
    expect(customElements.get("f8-player")).toBeDefined();
  });

  it("is idempotent on re-registration", () => {
    expect(() => defineF8Player()).not.toThrow();
  });
});

// ── Lifecycle / attach ────────────────────────────────────────────────────

describe("<f8-player> lifecycle", () => {
  it("renders an inner <video data-f8-player-video>", async () => {
    const el = await mount();
    const video = el.querySelector<HTMLVideoElement>("video[data-f8-player-video]");
    expect(video).not.toBeNull();
    expect(video!.hasAttribute("playsinline")).toBe(true);
  });

  it("calls player.attach with the inner <video> on firstUpdated", async () => {
    const el = await mount();
    const video = el.querySelector<HTMLVideoElement>("video[data-f8-player-video]");
    expect(mockPlayer.attach).toHaveBeenCalledTimes(1);
    expect(mockPlayer.attach).toHaveBeenCalledWith(video);
  });

  it("disposes the player on disconnect", async () => {
    const el = await mount();
    el.remove();
    expect(mockPlayer.dispose).toHaveBeenCalled();
  });

  it("forwards videoClass to the inner <video>", async () => {
    const el = document.createElement("f8-player") as F8PlayerElement;
    el.videoClass = "my-video";
    el.options = {};
    document.body.appendChild(el);
    await el.updateComplete;
    const video = el.querySelector<HTMLVideoElement>("video[data-f8-player-video]");
    expect(video!.classList.contains("my-video")).toBe(true);
  });

  it("renders a default slot and a `controls` named slot", async () => {
    const el = await mount();
    const slots = el.querySelectorAll("slot");
    expect(slots).toHaveLength(2);
    expect(slots[0]?.getAttribute("name")).toBeNull();
    expect(slots[1]?.getAttribute("name")).toBe("controls");
  });
});

// ── Default controls ───────────────────────────────────────────────────────

describe("<f8-player> default controls", () => {
  it("renders reusable F8 controls when `controls` is true", async () => {
    mockPlayer.getState.mockReturnValue({
      ...defaultState,
      status: "playing",
      currentTime: 15,
      duration: 90,
      volume: 0.5,
      qualities: [{ id: "720", height: 720, bitrate: 1_000_000, label: "720p" }],
      activeQuality: { id: "720", height: 720, bitrate: 1_000_000, label: "720p" },
    });

    const el = document.createElement("f8-player") as F8PlayerElement;
    el.options = {};
    el.controls = true;
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.hasAttribute("data-f8-player")).toBe(true);
    expect(el.getAttribute("data-theme")).toBe("classroom");
    expect(el.hasAttribute("data-controls-visible")).toBe(true);
    expect(el.querySelector("[data-f8-player-controls]")).toBeTruthy();
    expect(el.querySelector('[data-f8-player-controls-layout="two-row"]')).toBeTruthy();
    expect(el.querySelector('[data-f8-player-controls-row="timeline"]')).toBeTruthy();
    expect(el.querySelector('[data-f8-player-controls-row="actions"]')).toBeTruthy();
    expect(el.querySelector('[data-f8-player-control="play-pause"] [data-f8-player-icon="pause"]')).toBeTruthy();
    expect(el.querySelector('[data-f8-player-control="seek-bar"]')).toBeTruthy();
    expect(el.querySelector('[data-f8-player-control="seek-backward"]')).toBeTruthy();
    expect(el.querySelector('[data-f8-player-control="seek-forward"]')).toBeTruthy();
    expect(el.querySelector('[data-f8-player-control="quality"]')).toBeTruthy();
    expect(el.querySelector('[data-f8-player-quality-badge]')?.textContent).toBe("HD");
    expect(el.querySelector('[data-f8-player-control="settings"]')).toBeTruthy();
    expect(el.querySelector('[data-f8-player-control="fullscreen"]')).toBeTruthy();
  });

  it("delegates default control interactions to the core player", async () => {
    mockPlayer.getState.mockReturnValue({
      ...defaultState,
      status: "paused",
      duration: 100,
      qualities: [{ id: "360", height: 360, bitrate: 500_000, label: "360p" }],
    });

    const el = document.createElement("f8-player") as F8PlayerElement;
    el.options = {};
    el.controls = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const play = el.querySelector<HTMLButtonElement>('[data-f8-player-control="play-pause"]')!;
    play.click();
    expect(mockPlayer.play).toHaveBeenCalled();

    const seek = el.querySelector<HTMLInputElement>('[data-f8-player-control="seek-bar"]')!;
    seek.value = "42";
    seek.dispatchEvent(new Event("input", { bubbles: true }));
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(42);

    const seekBackward = el.querySelector<HTMLButtonElement>(
      '[data-f8-player-control="seek-backward"]',
    )!;
    seekBackward.click();
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(0);

    const volume = el.querySelector<HTMLInputElement>('[data-f8-player-control="volume"]')!;
    volume.value = "0.25";
    volume.dispatchEvent(new Event("input", { bubbles: true }));
    expect(mockPlayer.setVolume).toHaveBeenCalledWith(0.25);

    const mute = el.querySelector<HTMLButtonElement>('[data-f8-player-control="mute"]')!;
    mute.click();
    expect(mockPlayer.setMuted).toHaveBeenCalledWith(true);

    const quality = el.querySelector<HTMLSelectElement>("[data-f8-player-quality-select]")!;
    quality.value = "360";
    quality.dispatchEvent(new Event("change", { bubbles: true }));
    expect(mockPlayer.commands.run).toHaveBeenCalledWith(
      "hls-quality:set",
      expect.objectContaining({ id: "360" }),
    );

    const rate = el.querySelector<HTMLSelectElement>("[data-f8-player-settings-select]")!;
    rate.value = "1.5";
    rate.dispatchEvent(new Event("change", { bubbles: true }));
    expect(mockPlayer.setPlaybackRate).toHaveBeenCalledWith(1.5);

    const fullscreen = el.querySelector<HTMLButtonElement>(
      '[data-f8-player-control="fullscreen"]',
    )!;
    fullscreen.click();
    expect(mockPlayer.commands.run).toHaveBeenCalledWith("fullscreen:toggle");
  });
});

// ── Imperative API (PlayerHandle parity, G12) ─────────────────────────────

describe("<f8-player> imperative API", () => {
  it("play() delegates to player.play", async () => {
    const el = await mount();
    await el.play();
    expect(mockPlayer.play).toHaveBeenCalled();
  });

  it("play() resolves to undefined before connect", async () => {
    const el = document.createElement("f8-player") as F8PlayerElement;
    await expect(el.play()).resolves.toBeUndefined();
    expect(mockPlayer.play).not.toHaveBeenCalled();
  });

  it("pause() delegates to player.pause and captures currentTime", async () => {
    mockPlayer.getCurrentTime.mockReturnValue(42);
    const el = await mount();
    el.pause();
    expect(mockPlayer.pause).toHaveBeenCalled();
    // Re-pause shouldn't be required for restore; subsequent restore uses captured time.
    await el.restore();
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(42);
    expect(mockPlayer.play).toHaveBeenCalled();
  });

  it("paused() proxies player.paused", async () => {
    mockPlayer.paused.mockReturnValue(false);
    const el = await mount();
    expect(el.paused()).toBe(false);
  });

  it("paused() returns true if not connected (no player)", () => {
    const el = document.createElement("f8-player") as F8PlayerElement;
    expect(el.paused()).toBe(true);
  });

  it("seekTo() delegates to player.seekTo", async () => {
    const el = await mount();
    el.seekTo(30);
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(30);
  });

  it("restore() without prior pause just plays (no seek)", async () => {
    const el = await mount();
    await el.restore();
    expect(mockPlayer.seekTo).not.toHaveBeenCalled();
    expect(mockPlayer.play).toHaveBeenCalled();
  });

  it("raw exposes the core player after mount", async () => {
    const el = await mount();
    expect(el.raw).toBe(mockPlayer);
  });

  it("raw is null before mount", () => {
    const el = document.createElement("f8-player") as F8PlayerElement;
    expect(el.raw).toBeNull();
  });
});

// ── Event bridges ────────────────────────────────────────────────────────

describe("<f8-player> event bridges", () => {
  it("re-emits core events as f8-player:<name> CustomEvents", async () => {
    const el = await mount();
    const spy = vi.fn();
    el.addEventListener("f8-player:timeupdate", spy as EventListener);
    const payload = { currentTime: 7, playedSeconds: 7, duration: 100 };
    fireCoreEvent("timeupdate", payload);
    expect(spy).toHaveBeenCalledTimes(1);
    const ev = spy.mock.calls[0]?.[0] as CustomEvent;
    expect(ev.type).toBe("f8-player:timeupdate");
    expect(ev.detail).toEqual(payload);
    expect(ev.bubbles).toBe(true);
    expect(ev.composed).toBe(true);
  });

  it("re-emits play and pause", async () => {
    const el = await mount();
    const onPlay = vi.fn();
    const onPause = vi.fn();
    el.addEventListener("f8-player:play", onPlay as EventListener);
    el.addEventListener("f8-player:pause", onPause as EventListener);
    fireCoreEvent("play");
    fireCoreEvent("pause");
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it("re-emits error and unauthorized payloads verbatim", async () => {
    const el = await mount();
    const onError = vi.fn();
    const onUnauth = vi.fn();
    el.addEventListener("f8-player:error", onError as EventListener);
    el.addEventListener("f8-player:unauthorized", onUnauth as EventListener);
    const err = { code: "media", message: "boom" };
    const unauth = { url: "https://api/x.m3u8", status: 401, source: {} };
    fireCoreEvent("error", err);
    fireCoreEvent("unauthorized", unauth);
    expect((onError.mock.calls[0]?.[0] as CustomEvent).detail).toEqual(err);
    expect((onUnauth.mock.calls[0]?.[0] as CustomEvent).detail).toEqual(unauth);
  });

  it("registers bridges for every core event listed in PlayerEvents", async () => {
    await mount();
    const expected = [
      "ready",
      "play",
      "pause",
      "ended",
      "timeupdate",
      "durationchange",
      "ratechange",
      "volumechange",
      "seeking",
      "seeked",
      "buffering",
      "qualitychange",
      "error",
      "unauthorized",
      "fullscreenchange",
      "pipchange",
    ];
    for (const name of expected) {
      expect(eventHandlers.get(name)?.size ?? 0).toBeGreaterThan(0);
    }
  });
});
