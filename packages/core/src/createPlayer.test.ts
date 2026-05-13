/**
 * Behavior tests for `createPlayer`. We cover the orchestration logic that
 * unit tests further down can't see (lifecycle, source switching, native
 * `<video>` event bridge, hook plumbing).
 *
 * The HLS / YouTube providers are mocked at the module level so this suite
 * never tries to load `hls.js` or the YouTube IFrame API.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./sources/hls.js", () => ({
  createHlsProvider: () => ({
    name: "hls-mock",
    canHandle: () => false,
    createLoader: () => ({
      attach: () => Promise.resolve(),
      detach: () => undefined,
    }),
  }),
}));

vi.mock("./sources/youtube.js", () => ({
  createYouTubeProvider: () => ({
    name: "youtube-mock",
    canHandle: () => false,
    createLoader: () => ({
      attach: () => Promise.resolve(),
      detach: () => undefined,
    }),
  }),
}));

import { createPlayer } from "./createPlayer.js";
import { type SourceDescriptor, type SourceProvider } from "./types/source.js";

interface FlushHandle {
  flush: () => void;
}

function makeFlushable(): FlushHandle & {
  scheduleFlush: (run: () => void) => void;
} {
  const queue: Array<() => void> = [];
  return {
    scheduleFlush: (run) => queue.push(run),
    flush: () => {
      while (queue.length) queue.shift()?.();
    },
  };
}

let video: HTMLVideoElement;
let parent: HTMLDivElement;

beforeEach(() => {
  parent = document.createElement("div");
  document.body.appendChild(parent);
  video = document.createElement("video");
  parent.appendChild(video);
});

afterEach(() => {
  parent.remove();
});

describe("createPlayer — construction", () => {
  it("returns a Player with the full public surface", () => {
    const player = createPlayer();
    expect(typeof player.play).toBe("function");
    expect(typeof player.pause).toBe("function");
    expect(typeof player.attach).toBe("function");
    expect(typeof player.dispose).toBe("function");
    expect(typeof player.commands.add).toBe("function");
    player.dispose();
  });

  it("seeds the initial state from options", () => {
    const player = createPlayer({
      volume: 0.5,
      muted: true,
      playbackRate: 1.25,
      source: { src: "https://x.com/file.mp4" },
    });
    const state = player.getState();
    expect(state.volume).toBe(0.5);
    expect(state.muted).toBe(true);
    expect(state.playbackRate).toBe(1.25);
    expect(state.source).toEqual({ src: "https://x.com/file.mp4" });
    expect(state.status).toBe("idle");
    player.dispose();
  });

  it("registers plugins from options.plugins", () => {
    const setup = vi.fn(() => () => undefined);
    const plugin = { name: "p1", setup };
    const player = createPlayer({ plugins: [plugin] });
    expect(setup).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledWith(player, expect.any(Object));
    player.dispose();
    expect(setup).toHaveBeenCalledTimes(1);
  });
});

describe("createPlayer — attach / detach / dispose", () => {
  it("attach binds native event listeners", async () => {
    const player = createPlayer();
    await player.attach(video);
    const listener = vi.fn();
    player.on("timeupdate", listener);
    Object.defineProperty(video, "currentTime", { configurable: true, value: 5 });
    video.dispatchEvent(new Event("timeupdate"));
    expect(listener).toHaveBeenCalled();
    player.dispose();
  });

  it("attach with options.source dispatches setSource and reaches loading→ready", async () => {
    const provider: SourceProvider = {
      name: "test",
      canHandle: () => true,
      createLoader: () => ({
        attach: () => Promise.resolve(),
        detach: () => undefined,
      }),
    };
    const player = createPlayer(
      { source: { src: "https://x.com/file.mp4" } },
      { extraProviders: [provider] },
    );
    const flushable = makeFlushable();
    void flushable; // placeholder if needed later
    await player.attach(video);
    // The dispatched setSource resolves async; wait for the loader.
    await Promise.resolve();
    await Promise.resolve();
    expect(player.getState().status).toBe("ready");
    player.dispose();
  });

  it("attach to the same element is a no-op", async () => {
    const player = createPlayer();
    await player.attach(video);
    const before = video.outerHTML;
    await player.attach(video);
    expect(video.outerHTML).toBe(before);
    player.dispose();
  });

  it("detach unbinds listeners and clears the loader", async () => {
    const detach = vi.fn();
    const provider: SourceProvider = {
      name: "test",
      canHandle: () => true,
      createLoader: () => ({
        attach: () => Promise.resolve(),
        detach,
      }),
    };
    const player = createPlayer({}, { extraProviders: [provider] });
    await player.attach(video);
    player.setSource({ src: "https://x.com/file.mp4" });
    await Promise.resolve();
    await Promise.resolve();
    player.detach();
    expect(detach).toHaveBeenCalled();
    const listener = vi.fn();
    player.on("timeupdate", listener);
    video.dispatchEvent(new Event("timeupdate"));
    expect(listener).not.toHaveBeenCalled();
    player.dispose();
  });

  it("dispose makes subsequent calls no-ops", async () => {
    const player = createPlayer();
    await player.attach(video);
    player.dispose();
    expect(() => player.dispose()).not.toThrow();
    expect(() => player.pause()).not.toThrow();
  });

  it("dispose tears down plugins", () => {
    const teardown = vi.fn();
    const player = createPlayer({
      plugins: [{ name: "p", setup: () => teardown }],
    });
    player.dispose();
    expect(teardown).toHaveBeenCalledTimes(1);
  });

  it("attach after dispose throws", () => {
    const player = createPlayer();
    player.dispose();
    return expect(player.attach(video)).rejects.toThrow(/disposed/);
  });
});

describe("createPlayer — setSource", () => {
  function attachingProvider(): {
    provider: SourceProvider;
    attach: ReturnType<typeof vi.fn>;
    detach: ReturnType<typeof vi.fn>;
  } {
    const attach = vi.fn(() => Promise.resolve());
    const detach = vi.fn();
    return {
      attach,
      detach,
      provider: {
        name: "test",
        canHandle: () => true,
        createLoader: () => ({ attach, detach }),
      },
    };
  }

  it("non-null source moves through loading → ready", async () => {
    const { provider } = attachingProvider();
    const player = createPlayer({}, { extraProviders: [provider] });
    await player.attach(video);
    player.setSource({ src: "https://x.com/file.mp4" });
    expect(player.getState().status).toBe("loading");
    await Promise.resolve();
    await Promise.resolve();
    expect(player.getState().status).toBe("ready");
    player.dispose();
  });

  it("null source clears back to idle and detaches the loader", async () => {
    const { provider, detach } = attachingProvider();
    const player = createPlayer({}, { extraProviders: [provider] });
    await player.attach(video);
    player.setSource({ src: "https://x.com/file.mp4" });
    await Promise.resolve();
    await Promise.resolve();
    player.setSource(null);
    expect(player.getState().status).toBe("idle");
    expect(detach).toHaveBeenCalled();
    player.dispose();
  });

  it("loadFailed when no provider matches", async () => {
    const player = createPlayer();
    await player.attach(video);
    player.setSource({ src: "https://x.com/file.unknown", type: "dash" });
    await Promise.resolve();
    await Promise.resolve();
    expect(player.getState().status).toBe("error");
    expect(player.getState().error?.code).toBe("unsupported");
    player.dispose();
  });

  it("retry() replays the last source through loading → ready (C1)", async () => {
    let attachCalls = 0;
    const provider: SourceProvider = {
      name: "test",
      canHandle: () => true,
      createLoader: () => {
        attachCalls += 1;
        if (attachCalls === 1) {
          return {
            attach: () => Promise.reject(new Error("first attempt failed")),
            detach: () => undefined,
          };
        }
        return { attach: () => Promise.resolve(), detach: () => undefined };
      },
    };
    const player = createPlayer({}, { extraProviders: [provider] });
    await player.attach(video);
    player.setSource({ src: "https://x.com/a.mp4" });
    await Promise.resolve();
    await Promise.resolve();
    expect(player.getState().status).toBe("error");

    expect(player.retry()).toBe(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(player.getState().status).toBe("ready");
    expect(attachCalls).toBe(2);
    player.dispose();
  });

  it("retry() returns false when there is no source to replay (C1)", () => {
    const player = createPlayer();
    expect(player.retry()).toBe(false);
    player.dispose();
  });

  it("loader rejection moves to error state", async () => {
    const provider: SourceProvider = {
      name: "test",
      canHandle: () => true,
      createLoader: () => ({
        attach: () => Promise.reject(new Error("boom")),
        detach: () => undefined,
      }),
    };
    const onError = vi.fn();
    const player = createPlayer({ hooks: { onError } }, { extraProviders: [provider] });
    await player.attach(video);
    player.setSource({ src: "https://x.com/file.mp4" });
    await Promise.resolve();
    await Promise.resolve();
    expect(player.getState().status).toBe("error");
    expect(player.getState().error?.message).toBe("boom");
    expect(onError).toHaveBeenCalled();
    player.dispose();
  });

  it("replacing the source aborts the in-flight loader", async () => {
    let resolveFirst: (() => void) | null = null;
    const detachSpy = vi.fn();
    const provider: SourceProvider = {
      name: "test",
      canHandle: () => true,
      createLoader: () => ({
        attach: () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve;
          }),
        detach: detachSpy,
      }),
    };
    const player = createPlayer({}, { extraProviders: [provider] });
    await player.attach(video);
    player.setSource({ src: "https://x.com/a.mp4" });
    await Promise.resolve();

    player.setSource({ src: "https://x.com/b.mp4" });
    expect(detachSpy).toHaveBeenCalled();

    // Resolve the original — should not flip the state because we aborted.
    (resolveFirst as unknown as (() => void) | null)?.();
    await Promise.resolve();
    expect(player.getState().source?.src).toBe("https://x.com/b.mp4");
    player.dispose();
  });

  it("invokes loader.abort() when the source is replaced mid-flight (A4)", async () => {
    const abortSpy = vi.fn();
    let resolveFirst: (() => void) | null = null;
    let createLoaderCalls = 0;
    const provider: SourceProvider = {
      name: "test-with-abort",
      canHandle: () => true,
      createLoader: () => {
        createLoaderCalls += 1;
        if (createLoaderCalls === 1) {
          return {
            attach: () =>
              new Promise<void>((resolve) => {
                resolveFirst = resolve;
              }),
            detach: () => undefined,
            abort: abortSpy,
          };
        }
        return { attach: () => Promise.resolve(), detach: () => undefined };
      },
    };
    const player = createPlayer({}, { extraProviders: [provider] });
    await player.attach(video);
    player.setSource({ src: "https://x.com/a.mp4" });
    await Promise.resolve();
    expect(abortSpy).not.toHaveBeenCalled();

    player.setSource({ src: "https://x.com/b.mp4" });
    expect(abortSpy).toHaveBeenCalledTimes(1);

    // Late resolution from loader A must NOT flip state to "ready" for source B.
    (resolveFirst as unknown as (() => void) | null)?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(player.getState().source?.src).toBe("https://x.com/b.mp4");
    player.dispose();
  });

  it("survives a throwing loader.abort() without crashing the player (A4)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const provider: SourceProvider = {
      name: "throwing-abort",
      canHandle: () => true,
      createLoader: () => ({
        attach: () => new Promise<void>(() => undefined),
        detach: () => undefined,
        abort: () => {
          throw new Error("abort exploded");
        },
      }),
    };
    const player = createPlayer({}, { extraProviders: [provider] });
    await player.attach(video);
    player.setSource({ src: "https://x.com/a.mp4" });
    await Promise.resolve();
    // Replacing must not throw despite the throwing abort.
    expect(() => player.setSource({ src: "https://x.com/b.mp4" })).not.toThrow();
    expect(errSpy).toHaveBeenCalled();
    player.dispose();
    errSpy.mockRestore();
  });
});

describe("createPlayer — play / pause / seekTo", () => {
  function readyProvider(): SourceProvider {
    return {
      name: "test",
      canHandle: () => true,
      createLoader: () => ({
        attach: () => Promise.resolve(),
        detach: () => undefined,
      }),
    };
  }

  async function ready(extra: SourceDescriptor = { src: "https://x.com/file.mp4" }) {
    const player = createPlayer({ source: extra }, { extraProviders: [readyProvider()] });
    await player.attach(video);
    await Promise.resolve();
    await Promise.resolve();
    return player;
  }

  it("play() throws if no <video> attached", async () => {
    const player = createPlayer({ source: { src: "https://x.com/file.mp4" } });
    await expect(player.play()).rejects.toThrow(/no <video>/);
    player.dispose();
  });

  it("play() throws if no source", async () => {
    const player = createPlayer();
    await player.attach(video);
    await expect(player.play()).rejects.toThrow(/no source/);
    player.dispose();
  });

  it("play() calls video.play() and moves to playing", async () => {
    const player = await ready();
    const playSpy = vi.spyOn(video, "play").mockResolvedValue();
    await player.play();
    expect(playSpy).toHaveBeenCalled();
    expect(player.getState().status).toBe("playing");
    player.dispose();
  });

  it("pause() calls video.pause()", async () => {
    const player = await ready();
    vi.spyOn(video, "play").mockResolvedValue();
    await player.play();
    const pauseSpy = vi.spyOn(video, "pause").mockImplementation(() => undefined);
    player.pause();
    expect(pauseSpy).toHaveBeenCalled();
    expect(player.getState().status).toBe("paused");
    player.dispose();
  });

  it("paused() reflects video.paused", async () => {
    const player = await ready();
    Object.defineProperty(video, "paused", { configurable: true, get: () => true });
    expect(player.paused()).toBe(true);
    Object.defineProperty(video, "paused", { configurable: true, get: () => false });
    expect(player.paused()).toBe(false);
    player.dispose();
  });

  it("paused() returns true when no <video> is attached", () => {
    const player = createPlayer();
    expect(player.paused()).toBe(true);
    player.dispose();
  });

  it("seekTo clamps to [0, duration]", async () => {
    const player = await ready();
    Object.defineProperty(video, "duration", { configurable: true, value: 60 });
    player.seekTo(-5);
    expect(video.currentTime).toBe(0);
    player.seekTo(120);
    expect(video.currentTime).toBe(60);
    player.seekTo(30);
    expect(video.currentTime).toBe(30);
    player.dispose();
  });

  it("seekTo ignores non-finite values", async () => {
    const player = await ready();
    video.currentTime = 5;
    player.seekTo(Number.NaN);
    expect(video.currentTime).toBe(5);
    player.dispose();
  });

  it("setVolume clamps to [0, 1]", async () => {
    const player = await ready();
    player.setVolume(2);
    expect(video.volume).toBe(1);
    player.setVolume(-1);
    expect(video.volume).toBe(0);
    player.setVolume(0.5);
    expect(video.volume).toBe(0.5);
    player.dispose();
  });

  it("setMuted toggles video.muted", async () => {
    const player = await ready();
    player.setMuted(true);
    expect(video.muted).toBe(true);
    player.setMuted(false);
    expect(video.muted).toBe(false);
    player.dispose();
  });

  it("setPlaybackRate updates video.playbackRate", async () => {
    const player = await ready();
    player.setPlaybackRate(1.5);
    expect(video.playbackRate).toBe(1.5);
    player.setPlaybackRate(0); // ignored
    expect(video.playbackRate).toBe(1.5);
    player.setPlaybackRate(Number.NaN); // ignored
    expect(video.playbackRate).toBe(1.5);
    player.dispose();
  });
});

describe("createPlayer — defer-play during loading", () => {
  // A provider whose attach() never resolves on its own — the test drives
  // `loaded` via dispatching `loadedmetadata` on the <video>. Mirrors how
  // hls.js / native engines actually signal readiness.
  function pendingProvider(): SourceProvider {
    return {
      name: "pending",
      canHandle: () => true,
      createLoader: () => ({
        attach: () => new Promise<void>(() => undefined),
        detach: () => undefined,
      }),
    };
  }

  it("play() during loading defers; ready transition triggers play", async () => {
    const player = createPlayer(
      { source: { src: "https://x.com/file.mp4" } },
      { extraProviders: [pendingProvider()] },
    );
    await player.attach(video);
    expect(player.getState().status).toBe("loading");

    const playSpy = vi.spyOn(video, "play").mockResolvedValue();
    // First click while still loading — must not be lost.
    await player.play();
    expect(playSpy).not.toHaveBeenCalled();
    expect(player.getState().status).toBe("loading");

    // Engine signals readiness — queued play should fire automatically.
    Object.defineProperty(video, "duration", { configurable: true, value: 60 });
    video.dispatchEvent(new Event("loadedmetadata"));
    expect(player.getState().status).toBe("playing");
    expect(playSpy).toHaveBeenCalledTimes(1);
    player.dispose();
  });

  it("multiple play() calls during loading queue at most once", async () => {
    const player = createPlayer(
      { source: { src: "https://x.com/file.mp4" } },
      { extraProviders: [pendingProvider()] },
    );
    await player.attach(video);
    const playSpy = vi.spyOn(video, "play").mockResolvedValue();
    await player.play();
    await player.play();
    await player.play();
    video.dispatchEvent(new Event("loadedmetadata"));
    expect(playSpy).toHaveBeenCalledTimes(1);
    player.dispose();
  });

  it("pause() during loading cancels the queued play", async () => {
    const player = createPlayer(
      { source: { src: "https://x.com/file.mp4" } },
      { extraProviders: [pendingProvider()] },
    );
    await player.attach(video);
    const playSpy = vi.spyOn(video, "play").mockResolvedValue();
    await player.play();
    player.pause(); // explicitly cancel before ready
    video.dispatchEvent(new Event("loadedmetadata"));
    expect(playSpy).not.toHaveBeenCalled();
    expect(player.getState().status).toBe("ready");
    player.dispose();
  });

  it("setSource() during loading cancels the queued play", async () => {
    const player = createPlayer(
      { source: { src: "https://x.com/a.mp4" } },
      { extraProviders: [pendingProvider()] },
    );
    await player.attach(video);
    const playSpy = vi.spyOn(video, "play").mockResolvedValue();
    await player.play();
    player.setSource({ src: "https://x.com/b.mp4" });
    video.dispatchEvent(new Event("loadedmetadata"));
    expect(playSpy).not.toHaveBeenCalled();
    player.dispose();
  });

  it("dispose() during loading cancels the queued play", async () => {
    const player = createPlayer(
      { source: { src: "https://x.com/file.mp4" } },
      { extraProviders: [pendingProvider()] },
    );
    await player.attach(video);
    const playSpy = vi.spyOn(video, "play").mockResolvedValue();
    await player.play();
    player.dispose();
    video.dispatchEvent(new Event("loadedmetadata"));
    expect(playSpy).not.toHaveBeenCalled();
  });

  it("play() after ready dispatches immediately (no defer)", async () => {
    const player = createPlayer(
      { source: { src: "https://x.com/file.mp4" } },
      { extraProviders: [pendingProvider()] },
    );
    await player.attach(video);
    video.dispatchEvent(new Event("loadedmetadata"));
    expect(player.getState().status).toBe("ready");

    const playSpy = vi.spyOn(video, "play").mockResolvedValue();
    await player.play();
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(player.getState().status).toBe("playing");
    player.dispose();
  });
});

describe("createPlayer — events", () => {
  function readyProvider(): SourceProvider {
    return {
      name: "test",
      canHandle: () => true,
      createLoader: () => ({
        attach: () => Promise.resolve(),
        detach: () => undefined,
      }),
    };
  }

  it("forwards native timeupdate as the typed event", async () => {
    const player = createPlayer(
      { source: { src: "https://x.com/file.mp4" } },
      { extraProviders: [readyProvider()] },
    );
    await player.attach(video);
    await Promise.resolve();
    await Promise.resolve();
    Object.defineProperty(video, "currentTime", { configurable: true, value: 7.5 });
    Object.defineProperty(video, "duration", { configurable: true, value: 60 });
    const spy = vi.fn();
    player.on("timeupdate", spy);
    video.dispatchEvent(new Event("timeupdate"));
    expect(spy).toHaveBeenCalledWith({
      currentTime: 7.5,
      playedSeconds: 7.5,
      duration: 60,
    });
    player.dispose();
  });

  it("forwards native error as a runtimeError into the state machine", async () => {
    const player = createPlayer(
      { source: { src: "https://x.com/file.mp4" } },
      { extraProviders: [readyProvider()] },
    );
    await player.attach(video);
    await Promise.resolve();
    await Promise.resolve();
    Object.defineProperty(video, "error", {
      configurable: true,
      get: () => ({ code: 3, message: "decode" }) as MediaError,
    });
    video.dispatchEvent(new Event("error"));
    expect(player.getState().status).toBe("error");
    expect(player.getState().error?.code).toBe("decode");
    player.dispose();
  });

  it("subscribe fires only when the selected slice changes", async () => {
    const player = createPlayer({ source: { src: "https://x.com/x.mp4" } });
    const listener = vi.fn();
    player.subscribe((s) => s.muted, listener);
    await player.attach(video);
    player.setMuted(true);
    video.dispatchEvent(new Event("volumechange"));
    await Promise.resolve();
    expect(listener).toHaveBeenCalledWith(true);
    listener.mockClear();
    player.setMuted(true);
    video.dispatchEvent(new Event("volumechange"));
    await Promise.resolve();
    expect(listener).not.toHaveBeenCalled();
    player.dispose();
  });

  it("off removes a previously-on handler", async () => {
    const player = createPlayer();
    const handler = vi.fn();
    player.on("play", handler);
    player.off("play", handler);
    await player.attach(video);
    video.dispatchEvent(new Event("play"));
    expect(handler).not.toHaveBeenCalled();
    player.dispose();
  });
});

describe("createPlayer — plugins via .use", () => {
  it("registers a plugin and invokes its setup with player + host", async () => {
    const player = createPlayer();
    const setup = vi.fn(() => () => undefined);
    player.use({ name: "p", setup });
    expect(setup).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledWith(player, expect.any(Object));
    player.removePlugin("p");
    expect(setup).toHaveBeenCalledTimes(1);
    player.dispose();
  });
});

describe("createPlayer — derived getters", () => {
  it("getCurrentTime / getDuration / getBuffered reflect the store", async () => {
    const player = createPlayer(
      { source: { src: "https://x.com/x.mp4" } },
      {
        extraProviders: [
          {
            name: "test",
            canHandle: () => true,
            createLoader: () => ({
              attach: () => Promise.resolve(),
              detach: () => undefined,
            }),
          },
        ],
      },
    );
    await player.attach(video);
    await Promise.resolve();
    await Promise.resolve();
    Object.defineProperty(video, "currentTime", { configurable: true, value: 12 });
    Object.defineProperty(video, "duration", { configurable: true, value: 100 });
    Object.defineProperty(video, "buffered", {
      configurable: true,
      get: () =>
        ({
          length: 1,
          start: () => 0,
          end: () => 50,
        }) as unknown as TimeRanges,
    });
    video.dispatchEvent(new Event("timeupdate"));
    expect(player.getCurrentTime()).toBe(12);
    expect(player.getBuffered()).toEqual([{ start: 0, end: 50 }]);
    video.dispatchEvent(new Event("durationchange"));
    expect(player.getDuration()).toBe(100);
    player.dispose();
  });

  it("getSource() returns the active source descriptor (or null)", async () => {
    const player = createPlayer();
    expect(player.getSource()).toBeNull();
    player.setSource({ src: "https://x.com/file.mp4" });
    expect(player.getSource()?.src).toBe("https://x.com/file.mp4");
    player.setSource(null);
    expect(player.getSource()).toBeNull();
    player.dispose();
  });
});

describe("createPlayer — autoplay + detach resilience", () => {
  function readyProvider(): SourceProvider {
    return {
      name: "test",
      canHandle: () => true,
      createLoader: () => ({
        attach: () => Promise.resolve(),
        detach: () => undefined,
      }),
    };
  }

  it("autoplay='muted' mutes the video and triggers play() once ready", async () => {
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const player = createPlayer(
      {
        source: { src: "https://x.com/file.mp4" },
        autoplay: "muted",
      },
      { extraProviders: [readyProvider()] },
    );
    await player.attach(video);
    await Promise.resolve();
    await Promise.resolve();
    expect(video.muted).toBe(true);
    expect(playSpy).toHaveBeenCalled();
    playSpy.mockRestore();
    player.dispose();
  });

  it("autoplay='on' calls play() on ready without muting", async () => {
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const player = createPlayer(
      { source: { src: "https://x.com/file.mp4" }, autoplay: "on" },
      { extraProviders: [readyProvider()] },
    );
    await player.attach(video);
    await Promise.resolve();
    await Promise.resolve();
    expect(video.muted).toBe(false);
    expect(playSpy).toHaveBeenCalled();
    playSpy.mockRestore();
    player.dispose();
  });

  it("seeks to options.startTime once the source becomes ready", async () => {
    const player = createPlayer(
      { source: { src: "https://x.com/file.mp4" }, startTime: 42 },
      { extraProviders: [readyProvider()] },
    );
    await player.attach(video);
    await Promise.resolve();
    await Promise.resolve();
    expect(video.currentTime).toBe(42);
    player.dispose();
  });

  it("detach swallows errors thrown by the active loader.detach", async () => {
    const provider: SourceProvider = {
      name: "throwy",
      canHandle: () => true,
      createLoader: () => ({
        attach: () => Promise.resolve(),
        detach: () => {
          throw new Error("boom on detach");
        },
      }),
    };
    const player = createPlayer(
      { source: { src: "https://x.com/file.mp4" } },
      { extraProviders: [provider] },
    );
    await player.attach(video);
    await Promise.resolve();
    await Promise.resolve();
    expect(() => player.dispose()).not.toThrow();
  });

  it("autoplay still fires after detach + re-attach (A5)", async () => {
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const player = createPlayer(
      { source: { src: "https://x.com/file.mp4" }, autoplay: "muted" },
      { extraProviders: [readyProvider()] },
    );
    await player.attach(video);
    await Promise.resolve();
    await Promise.resolve();
    expect(playSpy).toHaveBeenCalledTimes(1);

    // Simulate component remount: detach then attach the same player to a
    // fresh <video>. Without the A5 fix, the second attach would NOT trigger
    // autoplay because `bus.emit("ready")` only fires on transition.
    player.detach();
    const video2 = document.createElement("video");
    parent.appendChild(video2);
    await player.attach(video2);
    expect(playSpy).toHaveBeenCalledTimes(2);

    playSpy.mockRestore();
    player.dispose();
  });

  it("does not leak ready-listeners across re-attach cycles (A5)", async () => {
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    const player = createPlayer(
      { source: { src: "https://x.com/file.mp4" }, autoplay: "muted" },
      { extraProviders: [readyProvider()] },
    );
    await player.attach(video);
    await Promise.resolve();
    await Promise.resolve();

    // Cycle attach/detach multiple times. autoplay should fire exactly once
    // per attach — never N+1 times due to leaked listeners.
    for (let i = 0; i < 3; i++) {
      const v = document.createElement("video");
      parent.appendChild(v);
      player.detach();
      await player.attach(v);
    }
    // 1 initial + 3 cycles = 4 calls.
    expect(playSpy).toHaveBeenCalledTimes(4);
    playSpy.mockRestore();
    player.dispose();
  });
});

describe("createPlayer — native event bridge & runtime errors", () => {
  function readyProvider(): SourceProvider {
    return {
      name: "test",
      canHandle: () => true,
      createLoader: () => ({
        attach: () => Promise.resolve(),
        detach: () => undefined,
      }),
    };
  }

  it("native seeking/seeked/waiting/playing emit corresponding bus events", async () => {
    const player = createPlayer(
      { source: { src: "https://x.com/file.mp4" } },
      { extraProviders: [readyProvider()] },
    );
    const seeking = vi.fn();
    const seeked = vi.fn();
    const buffering = vi.fn();
    player.on("seeking", seeking);
    player.on("seeked", seeked);
    player.on("buffering", buffering);
    await player.attach(video);
    await Promise.resolve();
    await Promise.resolve();
    Object.defineProperty(video, "currentTime", { configurable: true, value: 7 });
    video.dispatchEvent(new Event("seeking"));
    video.dispatchEvent(new Event("seeked"));
    video.dispatchEvent(new Event("waiting"));
    video.dispatchEvent(new Event("playing"));
    expect(seeking).toHaveBeenCalledWith({ time: 7 });
    expect(seeked).toHaveBeenCalledWith({ time: 7 });
    expect(buffering).toHaveBeenCalledWith({ isBuffering: true });
    expect(buffering).toHaveBeenCalledWith({ isBuffering: false });
    player.dispose();
  });

  it("volumechange / ratechange propagate through the bus", async () => {
    const player = createPlayer();
    const volumechange = vi.fn();
    const ratechange = vi.fn();
    player.on("volumechange", volumechange);
    player.on("ratechange", ratechange);
    await player.attach(video);
    Object.defineProperty(video, "volume", { configurable: true, value: 0.3 });
    Object.defineProperty(video, "muted", { configurable: true, value: true });
    video.dispatchEvent(new Event("volumechange"));
    Object.defineProperty(video, "playbackRate", { configurable: true, value: 1.5 });
    video.dispatchEvent(new Event("ratechange"));
    expect(volumechange).toHaveBeenCalledWith({ volume: 0.3, muted: true });
    expect(ratechange).toHaveBeenCalledWith({ playbackRate: 1.5 });
    player.dispose();
  });

  it("native loadedmetadata dispatches 'loaded' when status is 'loading'", async () => {
    const provider: SourceProvider = {
      name: "stuck",
      canHandle: () => true,
      // Loader that never resolves; loadedmetadata must be the trigger.
      createLoader: () => ({
        attach: () => new Promise<void>(() => undefined),
        detach: () => undefined,
      }),
    };
    const player = createPlayer(
      { source: { src: "https://x.com/file.mp4" } },
      { extraProviders: [provider] },
    );
    await player.attach(video);
    Object.defineProperty(video, "duration", { configurable: true, value: 80 });
    Object.defineProperty(video, "videoWidth", { configurable: true, value: 1280 });
    Object.defineProperty(video, "videoHeight", { configurable: true, value: 720 });
    expect(player.getState().status).toBe("loading");
    video.dispatchEvent(new Event("loadedmetadata"));
    expect(player.getState().status).toBe("ready");
    expect(player.getState().duration).toBe(80);
    expect(player.getState().videoWidth).toBe(1280);
    expect(player.getState().videoHeight).toBe(720);
    player.dispose();
  });

  it("native durationchange surfaces a non-finite duration as 0", async () => {
    const player = createPlayer();
    const onDuration = vi.fn();
    player.on("durationchange", onDuration);
    await player.attach(video);
    Object.defineProperty(video, "duration", {
      configurable: true,
      get: () => Number.NaN,
    });
    video.dispatchEvent(new Event("durationchange"));
    expect(onDuration).toHaveBeenCalledWith({ duration: 0 });
    player.dispose();
  });

  it("play() after 'ended' rewinds to 0 and resumes (replay path)", async () => {
    const player = createPlayer(
      { source: { src: "https://x.com/file.mp4" } },
      { extraProviders: [readyProvider()] },
    );
    await player.attach(video);
    await Promise.resolve();
    await Promise.resolve();
    const playSpy = vi.spyOn(video, "play").mockResolvedValue();
    await player.play();
    video.dispatchEvent(new Event("ended"));
    expect(player.getState().status).toBe("ended");
    Object.defineProperty(video, "currentTime", {
      configurable: true,
      writable: true,
      value: 30,
    });
    await player.play();
    expect(video.currentTime).toBe(0);
    expect(playSpy).toHaveBeenCalled();
    expect(player.getState().status).toBe("playing");
    player.dispose();
  });

  it("native pause / ended dispatch through the state machine", async () => {
    const player = createPlayer(
      { source: { src: "https://x.com/file.mp4" } },
      { extraProviders: [readyProvider()] },
    );
    const onPause = vi.fn();
    const onEnded = vi.fn();
    player.on("pause", onPause);
    player.on("ended", onEnded);
    await player.attach(video);
    await Promise.resolve();
    await Promise.resolve();
    video.dispatchEvent(new Event("play"));
    video.dispatchEvent(new Event("pause"));
    video.dispatchEvent(new Event("ended"));
    expect(onPause).toHaveBeenCalled();
    expect(onEnded).toHaveBeenCalled();
    expect(player.getState().status).toBe("ended");
    player.dispose();
  });

  it("native <video> error during load emits loadFailed → status='error'", async () => {
    const provider: SourceProvider = {
      name: "stuck",
      canHandle: () => true,
      // Loader that never resolves so the player stays in 'loading' when error fires.
      createLoader: () => ({
        attach: () => new Promise<void>(() => undefined),
        detach: () => undefined,
      }),
    };
    const player = createPlayer(
      { source: { src: "https://x.com/file.mp4" } },
      { extraProviders: [provider] },
    );
    const onError = vi.fn();
    player.on("error", onError);
    await player.attach(video);
    Object.defineProperty(video, "error", {
      configurable: true,
      get: () =>
        ({
          code: 2,
          MEDIA_ERR_ABORTED: 1,
          MEDIA_ERR_NETWORK: 2,
          MEDIA_ERR_DECODE: 3,
          MEDIA_ERR_SRC_NOT_SUPPORTED: 4,
        }) as unknown as MediaError,
    });
    video.dispatchEvent(new Event("error"));
    expect(player.getState().status).toBe("error");
    expect(player.getState().error?.code).toBe("network");
    player.dispose();
  });

  it("video.play() rejection surfaces as runtimeError", async () => {
    const playSpy = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockRejectedValue(new Error("autoplay blocked"));
    const player = createPlayer(
      { source: { src: "https://x.com/file.mp4" } },
      { extraProviders: [readyProvider()] },
    );
    await player.attach(video);
    await Promise.resolve();
    await Promise.resolve();
    await player.play().catch(() => {
      /* swallow — runtime error is what we test */
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(player.getState().error?.code).toBe("internal");
    playSpy.mockRestore();
    player.dispose();
  });
});
