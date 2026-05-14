/**
 * Tests for the `<reel-player>` custom element.
 *
 * `@f8team/reel-core`'s `createPlayer` is mocked so we don't need a real HLS
 * source or video element behavior. We additionally capture the event
 * handlers registered through `player.on(...)` so we can fire core events
 * synchronously and assert the `CustomEvent` re-emission.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { defineReelPlayer, type ReelPlayerElement } from "../ReelPlayer.js";

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

vi.mock("@f8team/reel-core", () => ({
  createPlayer: vi.fn(() => mockPlayer),
  formatTime: (seconds: number) => {
    const safe = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safe / 60);
    const rest = String(safe % 60).padStart(2, "0");
    return `${minutes}:${rest}`;
  },
  detectSourceType: (source: unknown) => {
    const src = (source as { src?: string } | null | undefined)?.src ?? "";
    if (/youtu\.?be/i.test(src)) return "youtube";
    if (/\.m3u8(\?|$)/i.test(src)) return "hls";
    return "mp4";
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

// Register `<reel-player>` once. defineReelPlayer is idempotent so this is safe.
defineReelPlayer();

// ── Helpers ────────────────────────────────────────────────────────────────

async function mount(options: unknown = {}): Promise<ReelPlayerElement> {
  const el = document.createElement("reel-player") as ReelPlayerElement;
  el.options = options as ReelPlayerElement["options"];
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
  for (const el of Array.from(document.body.querySelectorAll("reel-player"))) {
    el.remove();
  }
});

// ── defineReelPlayer ────────────────────────────────────────────────────────

describe("defineReelPlayer", () => {
  it("registers <reel-player> on customElements", () => {
    expect(customElements.get("reel-player")).toBeDefined();
  });

  it("is idempotent on re-registration", () => {
    expect(() => defineReelPlayer()).not.toThrow();
  });
});

// ── Lifecycle / attach ────────────────────────────────────────────────────

describe("<reel-player> lifecycle", () => {
  it("renders an inner <video data-reel-video>", async () => {
    const el = await mount();
    const video = el.querySelector<HTMLVideoElement>("video[data-reel-video]");
    expect(video).not.toBeNull();
    expect(video!.hasAttribute("playsinline")).toBe(true);
  });

  it("calls player.attach with the inner <video> on firstUpdated", async () => {
    const el = await mount();
    const video = el.querySelector<HTMLVideoElement>("video[data-reel-video]");
    expect(mockPlayer.attach).toHaveBeenCalledTimes(1);
    expect(mockPlayer.attach).toHaveBeenCalledWith(video);
  });

  it("disposes the player on disconnect", async () => {
    const el = await mount();
    el.remove();
    expect(mockPlayer.dispose).toHaveBeenCalled();
  });

  it("forwards videoClass to the inner <video>", async () => {
    const el = document.createElement("reel-player") as ReelPlayerElement;
    el.videoClass = "my-video";
    el.options = {};
    document.body.appendChild(el);
    await el.updateComplete;
    const video = el.querySelector<HTMLVideoElement>("video[data-reel-video]");
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

describe("<reel-player> default controls", () => {
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

    const el = document.createElement("reel-player") as ReelPlayerElement;
    el.options = {};
    el.controls = true;
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.hasAttribute("data-reel")).toBe(true);
    expect(el.getAttribute("data-theme")).toBe("classroom");
    expect(el.querySelector("[data-reel-controls]")).toBeTruthy();
    expect(el.querySelector('[data-reel-controls-layout="two-row"]')).toBeTruthy();
    expect(el.querySelector('[data-reel-controls-row="timeline"]')).toBeTruthy();
    expect(el.querySelector('[data-reel-controls-row="actions"]')).toBeTruthy();
    expect(
      el.querySelector('[data-reel-control="play-pause"] [data-reel-icon="pause"]'),
    ).toBeTruthy();
    expect(el.querySelector('[data-reel-control="seek-bar"]')).toBeTruthy();
    expect(el.querySelector('[data-reel-control="seek-backward"]')).toBeTruthy();
    expect(el.querySelector('[data-reel-control="seek-forward"]')).toBeTruthy();
    expect(el.querySelector('[data-reel-control="quality"]')).toBeTruthy();
    expect(el.querySelector("[data-reel-quality-badge]")?.textContent).toBe("HD");
    expect(el.querySelector('[data-reel-control="settings"]')).toBeTruthy();
    expect(el.querySelector('[data-reel-control="fullscreen"]')).toBeTruthy();
  });

  it("uses a compress icon while fullscreen is active", async () => {
    mockPlayer.getState.mockReturnValue({
      ...defaultState,
      fullscreen: true,
    });

    const el = document.createElement("reel-player") as ReelPlayerElement;
    el.options = {};
    el.controls = true;
    document.body.appendChild(el);
    await el.updateComplete;

    expect(
      el.querySelector('[data-reel-control="fullscreen"] [data-reel-icon="compress"]'),
    ).toBeTruthy();
  });

  it("delegates default control interactions to the core player", async () => {
    mockPlayer.getState.mockReturnValue({
      ...defaultState,
      status: "paused",
      duration: 100,
      qualities: [{ id: "360", height: 360, bitrate: 500_000, label: "360p" }],
    });

    const el = document.createElement("reel-player") as ReelPlayerElement;
    el.options = {};
    el.controls = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const play = el.querySelector<HTMLButtonElement>('[data-reel-control="play-pause"]')!;
    play.click();
    expect(mockPlayer.play).toHaveBeenCalled();

    const seek = el.querySelector<HTMLInputElement>('[data-reel-control="seek-bar"]')!;
    seek.value = "42";
    seek.dispatchEvent(new Event("input", { bubbles: true }));
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(42);

    const seekBackward = el.querySelector<HTMLButtonElement>(
      '[data-reel-control="seek-backward"]',
    )!;
    seekBackward.click();
    expect(mockPlayer.seekTo).toHaveBeenCalledWith(0);

    const volume = el.querySelector<HTMLInputElement>('[data-reel-control="volume"]')!;
    volume.value = "0.25";
    volume.dispatchEvent(new Event("input", { bubbles: true }));
    expect(mockPlayer.setVolume).toHaveBeenCalledWith(0.25);

    const mute = el.querySelector<HTMLButtonElement>('[data-reel-control="mute"]')!;
    mute.click();
    expect(mockPlayer.setMuted).toHaveBeenCalledWith(true);

    const qualityTrigger = el.querySelector<HTMLButtonElement>(
      '[data-reel-control-trigger="quality"]',
    )!;
    qualityTrigger.click();
    await el.updateComplete;
    const quality = el.querySelector<HTMLButtonElement>(
      '[data-reel-control-popover="quality"] [data-value="360"]',
    )!;
    quality.click();
    expect(mockPlayer.commands.run).toHaveBeenCalledWith(
      "hls-quality:set",
      expect.objectContaining({ id: "360" }),
    );

    const rateTrigger = el.querySelector<HTMLButtonElement>('[data-reel-control-trigger="speed"]')!;
    rateTrigger.click();
    await el.updateComplete;
    const rate = el.querySelector<HTMLButtonElement>(
      '[data-reel-control-popover="speed"] [data-value="1.5"]',
    )!;
    rate.click();
    expect(mockPlayer.setPlaybackRate).toHaveBeenCalledWith(1.5);

    const fullscreen = el.querySelector<HTMLButtonElement>('[data-reel-control="fullscreen"]')!;
    fullscreen.click();
    expect(mockPlayer.commands.run).toHaveBeenCalledWith("fullscreen:toggle");
  });

  it("closes an open menu when clicking inside the player but outside that menu", async () => {
    mockPlayer.getState.mockReturnValue({
      ...defaultState,
      status: "paused",
      qualities: [{ id: "360", height: 360, bitrate: 500_000, label: "360p" }],
    });

    const el = document.createElement("reel-player") as ReelPlayerElement;
    el.options = {};
    el.controls = true;
    document.body.appendChild(el);
    await el.updateComplete;

    el.querySelector<HTMLButtonElement>('[data-reel-control-trigger="quality"]')!.click();
    await el.updateComplete;
    expect(el.querySelector('[data-reel-control-popover="quality"]')).toBeTruthy();

    el.querySelector<HTMLButtonElement>('[data-reel-control="play-pause"]')!.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true }),
    );
    await Promise.resolve();
    await el.updateComplete;
    expect(el.querySelector('[data-reel-control-popover="quality"]')).toBeNull();
  });
});

// ── Imperative API (PlayerHandle parity, G12) ─────────────────────────────

describe("<reel-player> imperative API", () => {
  it("play() delegates to player.play", async () => {
    const el = await mount();
    await el.play();
    expect(mockPlayer.play).toHaveBeenCalled();
  });

  it("play() resolves to undefined before connect", async () => {
    const el = document.createElement("reel-player") as ReelPlayerElement;
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
    const el = document.createElement("reel-player") as ReelPlayerElement;
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
    const el = document.createElement("reel-player") as ReelPlayerElement;
    expect(el.raw).toBeNull();
  });
});

// ── Event bridges ────────────────────────────────────────────────────────

describe("<reel-player> event bridges", () => {
  it("re-emits core events as reel-player:<name> CustomEvents", async () => {
    const el = await mount();
    const spy = vi.fn();
    el.addEventListener("reel-player:timeupdate", spy as EventListener);
    const payload = { currentTime: 7, playedSeconds: 7, duration: 100 };
    fireCoreEvent("timeupdate", payload);
    expect(spy).toHaveBeenCalledTimes(1);
    const ev = spy.mock.calls[0]?.[0] as CustomEvent;
    expect(ev.type).toBe("reel-player:timeupdate");
    expect(ev.detail).toEqual(payload);
    expect(ev.bubbles).toBe(true);
    expect(ev.composed).toBe(true);
  });

  it("re-emits play and pause", async () => {
    const el = await mount();
    const onPlay = vi.fn();
    const onPause = vi.fn();
    el.addEventListener("reel-player:play", onPlay as EventListener);
    el.addEventListener("reel-player:pause", onPause as EventListener);
    fireCoreEvent("play");
    fireCoreEvent("pause");
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it("re-emits error and unauthorized payloads verbatim", async () => {
    const el = await mount();
    const onError = vi.fn();
    const onUnauth = vi.fn();
    el.addEventListener("reel-player:error", onError as EventListener);
    el.addEventListener("reel-player:unauthorized", onUnauth as EventListener);
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

// ── Default controls: thumbnails + captions ────────────────────────────────

describe("<reel-player controls> sprite thumbnails", () => {
  beforeEach(() => {
    mockPlayer.getState.mockReturnValue({
      ...defaultState,
      status: "paused",
      source: { src: "video.m3u8" },
      duration: 20,
    });
  });

  it("subscribes to thumbnails:ready and thumbnails:cleared on firstUpdated", async () => {
    const el = document.createElement("reel-player") as ReelPlayerElement;
    el.controls = true;
    el.options = { source: { src: "video.m3u8" } };
    document.body.appendChild(el);
    await el.updateComplete;

    expect(eventHandlers.get("thumbnails:ready")?.size ?? 0).toBeGreaterThan(0);
    expect(eventHandlers.get("thumbnails:cleared")?.size ?? 0).toBeGreaterThan(0);
  });

  it("does not render a thumbnail tile when no cues are loaded", async () => {
    const el = document.createElement("reel-player") as ReelPlayerElement;
    el.controls = true;
    el.options = { source: { src: "video.m3u8" } };
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.querySelector("[data-reel-seek-thumbnail]")).toBeNull();
  });

  it("keeps the hover thumbnail inside the player right edge", async () => {
    const el = document.createElement("reel-player") as ReelPlayerElement;
    el.controls = true;
    el.options = { source: { src: "video.m3u8" } };
    document.body.appendChild(el);
    await el.updateComplete;

    fireCoreEvent("thumbnails:ready", {
      cues: [{ start: 0, end: 20, src: "sprite.jpg", x: 0, y: 0, w: 160, h: 90 }],
    });
    await el.updateComplete;

    const wrapper = el.querySelector<HTMLElement>("[data-reel-seek-wrapper]")!;
    Object.defineProperty(el, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ left: 0, width: 300 }),
    });
    Object.defineProperty(wrapper, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ left: 50, width: 250 }),
    });

    wrapper.dispatchEvent(new MouseEvent("pointermove", { clientX: 300, bubbles: true }));
    await el.updateComplete;

    const tileStyle = el
      .querySelector<HTMLElement>("[data-reel-seek-thumbnail]")!
      .getAttribute("style")!;
    expect(tileStyle).toContain("left:162px");
    expect(tileStyle).toContain("width:80px");
  });
});

describe("<reel-player controls> captions", () => {
  beforeEach(() => {
    mockPlayer.getState.mockReturnValue({
      ...defaultState,
      status: "paused",
      source: {
        src: "video.m3u8",
        tracks: [
          { src: "vi.vtt", srcLang: "vi", label: "Tiếng Việt", default: true },
          { src: "en.vtt", srcLang: "en", label: "English" },
        ],
      },
    });
  });

  it("renders a captions listbox when source has tracks", async () => {
    const el = document.createElement("reel-player") as ReelPlayerElement;
    el.controls = true;
    el.options = { source: { src: "video.m3u8" } };
    document.body.appendChild(el);
    await el.updateComplete;

    const captions = el.querySelector('[data-reel-control="captions"]');
    expect(captions).not.toBeNull();
    captions!.querySelector<HTMLButtonElement>('[data-reel-control-trigger="captions"]')!.click();
    await el.updateComplete;
    const values = Array.from(
      el.querySelectorAll<HTMLButtonElement>('[data-reel-control-popover="captions"] [data-value]'),
    ).map((o) => o.dataset.value);
    expect(values).toEqual(["__off__", "vi", "en"]);
  });

  it("runs subtitles:setLang when the user changes language", async () => {
    const el = document.createElement("reel-player") as ReelPlayerElement;
    el.controls = true;
    el.options = { source: { src: "video.m3u8" } };
    document.body.appendChild(el);
    await el.updateComplete;

    el.querySelector<HTMLButtonElement>('[data-reel-control-trigger="captions"]')!.click();
    await el.updateComplete;
    el.querySelector<HTMLButtonElement>(
      '[data-reel-control-popover="captions"] [data-value="en"]',
    )!.click();
    expect(mockPlayer.commands.run).toHaveBeenCalledWith("subtitles:setLang", "en");
  });

  it("runs subtitles:off when the user picks the off option", async () => {
    const el = document.createElement("reel-player") as ReelPlayerElement;
    el.controls = true;
    el.options = { source: { src: "video.m3u8" } };
    document.body.appendChild(el);
    await el.updateComplete;

    el.querySelector<HTMLButtonElement>('[data-reel-control-trigger="captions"]')!.click();
    await el.updateComplete;
    el.querySelector<HTMLButtonElement>(
      '[data-reel-control-popover="captions"] [data-value="__off__"]',
    )!.click();
    expect(mockPlayer.commands.run).toHaveBeenCalledWith("subtitles:off");
  });

  it("hides the captions control when source has no tracks", async () => {
    mockPlayer.getState.mockReturnValue({
      ...defaultState,
      status: "paused",
      source: { src: "video.m3u8" },
    });
    const el = document.createElement("reel-player") as ReelPlayerElement;
    el.controls = true;
    el.options = { source: { src: "video.m3u8" } };
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.querySelector('[data-reel-control="captions"]')).toBeNull();
  });
});

// ── Default controls: native captions (textTracks fallback) ─────────────────

describe("<reel-player controls> native captions (textTracks fallback)", () => {
  /** Replace videoEl.textTracks with a minimal array-like mock. */
  function mockVideoTextTracks(
    el: ReelPlayerElement,
    tracks: { kind: string; language: string; label: string; mode: string }[],
  ): void {
    const video = el.querySelector<HTMLVideoElement>("video[data-reel-video]")!;
    // Spread into an array so Array.from() iterates the track entries.
    const list = Object.assign([...tracks] as unknown[], {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as TextTrackList;
    Object.defineProperty(video, "textTracks", { get: () => list, configurable: true });
  }

  beforeEach(() => {
    mockPlayer.getState.mockReturnValue({
      ...defaultState,
      source: { src: "video.m3u8" }, // no source.tracks → native path
    });
  });

  it("shows CC control from native textTracks when source has no plugin tracks", async () => {
    const el = document.createElement("reel-player") as ReelPlayerElement;
    el.controls = true;
    el.options = { source: { src: "video.m3u8" } };
    document.body.appendChild(el);
    await el.updateComplete;

    mockVideoTextTracks(el, [
      { kind: "captions", language: "vi", label: "Tiếng Việt", mode: "hidden" },
    ]);
    el.requestUpdate();
    await el.updateComplete;

    const captions = el.querySelector('[data-reel-control="captions"]');
    expect(captions).not.toBeNull();
    captions!.querySelector<HTMLButtonElement>('[data-reel-control-trigger="captions"]')!.click();
    await el.updateComplete;
    const options = Array.from(
      el.querySelectorAll<HTMLButtonElement>('[data-reel-control-popover="captions"] [data-value]'),
    ).map((o) => o.dataset.value);
    expect(options).toEqual(["__off__", "vi"]);
  });

  it("sets native track mode to 'showing' when user selects a language", async () => {
    const el = document.createElement("reel-player") as ReelPlayerElement;
    el.controls = true;
    el.options = { source: { src: "video.m3u8" } };
    document.body.appendChild(el);
    await el.updateComplete;

    const nativeTrack = { kind: "captions", language: "vi", label: "Tiếng Việt", mode: "hidden" };
    mockVideoTextTracks(el, [nativeTrack]);
    el.requestUpdate();
    await el.updateComplete;

    el.querySelector<HTMLButtonElement>('[data-reel-control-trigger="captions"]')!.click();
    await el.updateComplete;
    el.querySelector<HTMLButtonElement>(
      '[data-reel-control-popover="captions"] [data-value="vi"]',
    )!.click();
    expect(nativeTrack.mode).toBe("showing");
  });

  it("sets all native tracks to 'hidden' when user picks the off option", async () => {
    const el = document.createElement("reel-player") as ReelPlayerElement;
    el.controls = true;
    el.options = { source: { src: "video.m3u8" } };
    document.body.appendChild(el);
    await el.updateComplete;

    const nativeTrack = { kind: "captions", language: "vi", label: "Tiếng Việt", mode: "showing" };
    mockVideoTextTracks(el, [nativeTrack]);
    el.requestUpdate();
    await el.updateComplete;

    el.querySelector<HTMLButtonElement>('[data-reel-control-trigger="captions"]')!.click();
    await el.updateComplete;
    el.querySelector<HTMLButtonElement>(
      '[data-reel-control-popover="captions"] [data-value="__off__"]',
    )!.click();
    expect(nativeTrack.mode).toBe("hidden");
  });

  it("hides CC control when both source.tracks and textTracks are empty", async () => {
    const el = document.createElement("reel-player") as ReelPlayerElement;
    el.controls = true;
    el.options = { source: { src: "video.m3u8" } };
    document.body.appendChild(el);
    await el.updateComplete;

    // No mock → JSDOM has an empty TextTrackList by default.
    expect(el.querySelector('[data-reel-control="captions"]')).toBeNull();
  });
});

describe("<reel-player> reactive source property (Phase 2 T2.5)", () => {
  it("calls player.setSource() when the source property is set after mount", async () => {
    const el = await mount({});
    expect(mockPlayer.setSource).not.toHaveBeenCalled();

    el.source = { src: "video1.m3u8" };
    await el.updateComplete;
    expect(mockPlayer.setSource).toHaveBeenCalledWith(
      expect.objectContaining({ src: "video1.m3u8" }),
    );

    el.source = { src: "video2.m3u8" };
    await el.updateComplete;
    expect(mockPlayer.setSource).toHaveBeenCalledTimes(2);
    expect(mockPlayer.setSource).toHaveBeenLastCalledWith(
      expect.objectContaining({ src: "video2.m3u8" }),
    );
  });

  it("is a no-op when reassigning a source with the same src string", async () => {
    const el = await mount({});
    const src = { src: "video.m3u8" };
    el.source = src;
    await el.updateComplete;
    expect(mockPlayer.setSource).toHaveBeenCalledTimes(1);

    // New object literal, identical src → must not retrigger setSource.
    el.source = { src: "video.m3u8" };
    await el.updateComplete;
    expect(mockPlayer.setSource).toHaveBeenCalledTimes(1);

    // Identity match → also no-op.
    el.source = src;
    await el.updateComplete;
    expect(mockPlayer.setSource).toHaveBeenCalledTimes(1);
  });

  it("calls setSource when the descriptor changes via tracks identity", async () => {
    const el = await mount({});
    el.source = { src: "video.m3u8", tracks: [] };
    await el.updateComplete;
    expect(mockPlayer.setSource).toHaveBeenCalledTimes(1);

    // Same src, but tracks array reference changed → counts as a change.
    el.source = {
      src: "video.m3u8",
      tracks: [{ src: "vi.vtt", srcLang: "vi", label: "Tiếng Việt" }],
    };
    await el.updateComplete;
    expect(mockPlayer.setSource).toHaveBeenCalledTimes(2);
  });
});
