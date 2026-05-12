import type { Player, PluginHost } from "@f8/player-core";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { createSubtitlesPlugin } from "./subtitles.js";

function makePlayer(): Player {
  return {
    getState: vi.fn(),
    on: vi.fn().mockReturnValue(() => undefined),
    subscribe: vi.fn().mockReturnValue(() => undefined),
    play: vi.fn(),
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
    off: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    dispose: vi.fn(),
    use: vi.fn(),
    removePlugin: vi.fn(),
    commands: { add: vi.fn().mockReturnValue(() => undefined), run: vi.fn(), has: vi.fn() },
  } as unknown as Player;
}

function makeHost(): PluginHost & { _getCmds: () => Record<string, (p: unknown) => void> } {
  const cmds: Record<string, (p: unknown) => void> = {};
  return {
    controls: { contribute: vi.fn().mockReturnValue(() => undefined) },
    commands: {
      add: vi.fn().mockImplementation((name: string, h: (p: unknown) => void) => {
        cmds[name] = h;
        return () => {
          delete cmds[name];
        };
      }),
      run: vi.fn().mockImplementation((name: string, p?: unknown) => cmds[name]?.(p)),
      has: vi.fn(),
    },
    store: { getState: vi.fn(), subscribe: vi.fn().mockReturnValue(() => undefined) },
    emit: vi.fn(),
    _getCmds: () => cmds,
  };
}

function makeTrack(language: string, label: string): TextTrack {
  let _mode: TextTrackMode = "hidden";
  return {
    language,
    label,
    kind: "subtitles",
    id: language,
    inBandMetadataTrackDispatchType: "",
    get mode() {
      return _mode;
    },
    set mode(v: TextTrackMode) {
      _mode = v;
    },
    cues: null,
    activeCues: null,
    addCue: vi.fn(),
    removeCue: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn().mockReturnValue(false),
  } as unknown as TextTrack;
}

describe("createSubtitlesPlugin", () => {
  let videoEl: HTMLVideoElement;
  let viTrack: TextTrack;
  let enTrack: TextTrack;

  beforeEach(() => {
    vi.useFakeTimers();
    videoEl = document.createElement("video");
    videoEl.setAttribute("data-f8-player-video", "");
    viTrack = makeTrack("vi", "Tiếng Việt");
    enTrack = makeTrack("en", "English");
    // Stub textTracks
    Object.defineProperty(videoEl, "textTracks", {
      configurable: true,
      get: () => ({
        length: 2,
        item: (i: number) => [viTrack, enTrack][i],
        [Symbol.iterator]: function* () {
          yield viTrack;
          yield enTrack;
        },
      }),
    });
    document.body.appendChild(videoEl);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.removeChild(videoEl);
  });

  it("has name 'subtitles'", () => {
    expect(createSubtitlesPlugin().name).toBe("subtitles");
  });

  it("registers subtitles:setLang and subtitles:off commands", () => {
    const host = makeHost();
    createSubtitlesPlugin().setup(makePlayer(), host);
    expect(host.commands.add).toHaveBeenCalledWith("subtitles:setLang", expect.any(Function));
    expect(host.commands.add).toHaveBeenCalledWith("subtitles:off", expect.any(Function));
  });

  it("sets defaultLang track to showing after timeout", () => {
    const host = makeHost();
    createSubtitlesPlugin({ defaultLang: "vi" }).setup(makePlayer(), host);
    vi.runAllTimers();
    expect(viTrack.mode).toBe("showing");
    expect(enTrack.mode).toBe("hidden");
  });

  it("hides all tracks when off=true", () => {
    const host = makeHost();
    createSubtitlesPlugin({ off: true }).setup(makePlayer(), host);
    vi.runAllTimers();
    expect(viTrack.mode).toBe("hidden");
    expect(enTrack.mode).toBe("hidden");
  });

  it("subtitles:setLang switches the active track", () => {
    const host = makeHost();
    createSubtitlesPlugin().setup(makePlayer(), host);
    vi.runAllTimers();
    host.commands.run("subtitles:setLang", "en");
    expect(enTrack.mode).toBe("showing");
    expect(viTrack.mode).toBe("hidden");
  });

  it("subtitles:off hides all tracks", () => {
    const host = makeHost();
    createSubtitlesPlugin({ defaultLang: "vi" }).setup(makePlayer(), host);
    vi.runAllTimers();
    host.commands.run("subtitles:off");
    expect(viTrack.mode).toBe("hidden");
    expect(enTrack.mode).toBe("hidden");
    expect(host.emit).toHaveBeenCalledWith("subtitles:changed", expect.any(Array));
  });

  it("teardown clears timeout and disposes commands", () => {
    const plugin = createSubtitlesPlugin();
    const teardown = plugin.setup(makePlayer(), makeHost());
    expect(() => teardown?.()).not.toThrow();
  });
});
