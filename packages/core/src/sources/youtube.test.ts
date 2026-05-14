import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createYouTubeProvider,
  extractYouTubeId,
  type YouTubePlayerInstance,
  type YouTubeRuntime,
} from "./youtube.js";

describe("extractYouTubeId", () => {
  it("extracts from watch?v=", () => {
    expect(extractYouTubeId("https://www.youtube.com/watch?v=abc123")).toBe("abc123");
    expect(extractYouTubeId("https://www.youtube.com/watch?v=abc123&t=10s")).toBe("abc123");
  });

  it("extracts from youtu.be/", () => {
    expect(extractYouTubeId("https://youtu.be/xyz789")).toBe("xyz789");
  });

  it("extracts from /embed/", () => {
    expect(extractYouTubeId("https://www.youtube.com/embed/qrs456")).toBe("qrs456");
  });

  it("extracts from /shorts/", () => {
    expect(extractYouTubeId("https://www.youtube.com/shorts/short01")).toBe("short01");
  });

  it("returns null for non-YouTube URLs", () => {
    expect(extractYouTubeId("https://cdn.example.com/file.mp4")).toBeNull();
  });
});

describe("createYouTubeProvider — canHandle", () => {
  const provider = createYouTubeProvider();

  it("matches youtube.com/youtu.be URLs", () => {
    expect(provider.canHandle({ src: "https://youtube.com/watch?v=abc" })).toBe(true);
    expect(provider.canHandle({ src: "https://youtu.be/abc" })).toBe(true);
  });

  it("matches type='youtube' explicitly", () => {
    expect(provider.canHandle({ src: "https://x.com/file.mp4", type: "youtube" })).toBe(true);
  });

  it("rejects non-YouTube sources", () => {
    expect(provider.canHandle({ src: "https://cdn.example.com/file.mp4" })).toBe(false);
    expect(provider.canHandle({ src: "https://cdn.example.com/master.m3u8" })).toBe(false);
  });
});

describe("createYouTubeProvider — loader lifecycle", () => {
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

  function makeRuntime(
    opts: {
      onReady?: boolean;
      onError?: { data: number };
      stateAfterReady?: number[];
    } = {},
  ): {
    runtime: YouTubeRuntime;
    instances: YouTubePlayerInstance[];
    fireStateChange: (data: number) => void;
  } {
    const instances: YouTubePlayerInstance[] = [];
    const PlayerState = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 } as const;
    let stateChangeHandler:
      | ((e: { data: number; target: YouTubePlayerInstance }) => void)
      | undefined;
    let lastInstance: YouTubePlayerInstance | null = null;
    class FakeYTPlayer implements YouTubePlayerInstance {
      private _destroyed = false;
      private _now = 0;
      constructor(
        _el: HTMLElement,
        options: {
          videoId?: string;
          events?: {
            onReady?: (e: { target: YouTubePlayerInstance }) => void;
            onError?: (e: { data: number; target: YouTubePlayerInstance }) => void;
            onStateChange?: (e: { data: number; target: YouTubePlayerInstance }) => void;
          };
        },
      ) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        instances.push(self);
        lastInstance = self;
        stateChangeHandler = options.events?.onStateChange;
        queueMicrotask(() => {
          if (opts.onError) {
            options.events?.onError?.({ data: opts.onError.data, target: this });
            return;
          }
          if (opts.onReady ?? true) {
            options.events?.onReady?.({ target: this });
            for (const data of opts.stateAfterReady ?? []) {
              options.events?.onStateChange?.({ data, target: this });
            }
          }
        });
      }
      _setNow(t: number): void {
        this._now = t;
      }
      playVideo(): void {
        /* noop */
      }
      pauseVideo(): void {
        /* noop */
      }
      seekTo(): void {
        /* noop */
      }
      getCurrentTime(): number {
        return this._now;
      }
      getDuration(): number {
        return 0;
      }
      getPlayerState(): number {
        return PlayerState.PAUSED;
      }
      destroy(): void {
        this._destroyed = true;
      }
      get destroyed(): boolean {
        return this._destroyed;
      }
    }
    return {
      runtime: {
        Player: FakeYTPlayer as unknown as YouTubeRuntime["Player"],
        PlayerState,
      },
      instances,
      fireStateChange: (data: number) => {
        if (!lastInstance || !stateChangeHandler) return;
        stateChangeHandler({ data, target: lastInstance });
      },
    };
  }

  it("rejects when the source URL has no extractable id", async () => {
    const provider = createYouTubeProvider({
      loadRuntime: () => Promise.resolve(makeRuntime().runtime),
    });
    const loader = provider.createLoader();
    await expect(loader.attach(video, { src: "https://cdn.example.com/file.mp4" })).rejects.toThrow(
      /extract YouTube videoId/,
    );
  });

  it("rejects when <video> has no parent element", async () => {
    const orphan = document.createElement("video");
    const provider = createYouTubeProvider({
      loadRuntime: () => Promise.resolve(makeRuntime().runtime),
    });
    const loader = provider.createLoader();
    await expect(loader.attach(orphan, { src: "https://youtube.com/watch?v=abc" })).rejects.toThrow(
      /attached to the DOM/,
    );
  });

  it("loads the runtime, mounts an off-DOM iframe host, and resolves on onReady", async () => {
    const onStateChange = vi.fn();
    const { runtime } = makeRuntime();
    const provider = createYouTubeProvider({
      loadRuntime: () => Promise.resolve(runtime),
      onStateChange,
    });
    const loader = provider.createLoader();
    await loader.attach(video, { src: "https://youtube.com/watch?v=abc" });
    expect(parent.querySelector("[data-reel-yt-host]")).toBeTruthy();
    expect(onStateChange).toHaveBeenCalledWith("ready");
  });

  it("yt-host fills the stage (position:absolute, inset:0, width/height 100%)", async () => {
    const { runtime } = makeRuntime();
    const provider = createYouTubeProvider({ loadRuntime: () => Promise.resolve(runtime) });
    const loader = provider.createLoader();
    await loader.attach(video, { src: "https://youtube.com/watch?v=abc" });
    const host = parent.querySelector<HTMLElement>("[data-reel-yt-host]")!;
    expect(host.style.position).toBe("absolute");
    expect(host.style.width).toBe("100%");
    expect(host.style.height).toBe("100%");
  });

  it("marks the underlying <video> via data-attribute (not inline style) while YT owns playback (B6)", async () => {
    const provider = createYouTubeProvider({
      loadRuntime: () => Promise.resolve(makeRuntime().runtime),
    });
    const loader = provider.createLoader();
    await loader.attach(video, { src: "https://youtube.com/watch?v=abc" });
    // CSS theme contract owns the actual visibility rule; the loader only
    // toggles the data-attribute so host CSS / dark mode / transitions are
    // never overwritten by inline styles (B6).
    expect(video.hasAttribute("data-reel-yt-hidden")).toBe(true);
    expect(video.style.visibility).toBe("");
    loader.detach();
    expect(video.hasAttribute("data-reel-yt-hidden")).toBe(false);
  });

  it("rejects + onError when YT fires onError", async () => {
    const onError = vi.fn();
    const { runtime } = makeRuntime({ onError: { data: 100 } });
    const provider = createYouTubeProvider({
      loadRuntime: () => Promise.resolve(runtime),
      onError,
    });
    const loader = provider.createLoader();
    await expect(loader.attach(video, { src: "https://youtube.com/watch?v=abc" })).rejects.toThrow(
      /YouTube error/,
    );
    expect(onError).toHaveBeenCalledWith({
      message: "YouTube error code=100",
      cause: { code: 100 },
    });
  });

  it("detach destroys the YT instance and removes the host node", async () => {
    const { runtime, instances } = makeRuntime();
    const provider = createYouTubeProvider({ loadRuntime: () => Promise.resolve(runtime) });
    const loader = provider.createLoader();
    await loader.attach(video, { src: "https://youtube.com/watch?v=abc" });
    loader.detach();
    expect((instances[0] as unknown as { destroyed: boolean }).destroyed).toBe(true);
    expect(parent.querySelector("[data-reel-yt-host]")).toBeNull();
  });

  it("detach is idempotent", async () => {
    const { runtime } = makeRuntime();
    const provider = createYouTubeProvider({ loadRuntime: () => Promise.resolve(runtime) });
    const loader = provider.createLoader();
    await loader.attach(video, { src: "https://youtube.com/watch?v=abc" });
    expect(() => {
      loader.detach();
      loader.detach();
    }).not.toThrow();
  });

  it("forwards onStateChange for PLAYING/PAUSED/ENDED/BUFFERING", async () => {
    const onStateChange = vi.fn();
    const { runtime, fireStateChange } = makeRuntime();
    const provider = createYouTubeProvider({
      loadRuntime: () => Promise.resolve(runtime),
      onStateChange,
    });
    const loader = provider.createLoader();
    await loader.attach(video, { src: "https://youtube.com/watch?v=abc" });
    onStateChange.mockClear();
    fireStateChange(1); // PLAYING
    fireStateChange(2); // PAUSED
    fireStateChange(0); // ENDED
    fireStateChange(3); // BUFFERING
    fireStateChange(99); // unknown — default branch (no event)
    expect(onStateChange.mock.calls.map((c) => c[0])).toEqual([
      "playing",
      "paused",
      "ended",
      "buffering",
    ]);
  });

  it("starts a time bridge interval that polls getCurrentTime", async () => {
    vi.useFakeTimers();
    try {
      const { runtime, instances } = makeRuntime();
      const provider = createYouTubeProvider({ loadRuntime: () => Promise.resolve(runtime) });
      const loader = provider.createLoader();
      const attachP = loader.attach(video, { src: "https://youtube.com/watch?v=abc" });
      // Flush microtasks so YT.Player onReady fires.
      await vi.advanceTimersByTimeAsync(0);
      await attachP;
      const inst = instances[0] as unknown as { _setNow(t: number): void };
      inst._setNow(12.5);
      await vi.advanceTimersByTimeAsync(260);
      // Polling has happened; reading currentTime via the public path is internal,
      // but we at least verify the interval ran without throwing and the loader
      // exposes the same instance.
      expect(instances).toHaveLength(1);
      // detach clears the interval — second tick should not throw afterwards.
      loader.detach();
      await vi.advanceTimersByTimeAsync(500);
    } finally {
      vi.useRealTimers();
    }
  });

  it("swallows getCurrentTime errors during polling", async () => {
    vi.useFakeTimers();
    try {
      const { runtime, instances } = makeRuntime();
      const provider = createYouTubeProvider({ loadRuntime: () => Promise.resolve(runtime) });
      const loader = provider.createLoader();
      const attachP = loader.attach(video, { src: "https://youtube.com/watch?v=abc" });
      await vi.advanceTimersByTimeAsync(0);
      await attachP;
      // Force getCurrentTime to throw on the next tick.
      const inst = instances[0] as YouTubePlayerInstance;
      const original = inst.getCurrentTime;
      inst.getCurrentTime = () => {
        throw new Error("yt time blew up");
      };
      expect(() => vi.advanceTimersByTime(500)).not.toThrow();
      inst.getCurrentTime = original;
      loader.detach();
    } finally {
      vi.useRealTimers();
    }
  });

  it("detach swallows errors thrown by YT.destroy()", async () => {
    const { runtime, instances } = makeRuntime();
    const provider = createYouTubeProvider({ loadRuntime: () => Promise.resolve(runtime) });
    const loader = provider.createLoader();
    await loader.attach(video, { src: "https://youtube.com/watch?v=abc" });
    instances[0]!.destroy = () => {
      throw new Error("destroy blew up");
    };
    expect(() => loader.detach()).not.toThrow();
  });

  it("rejects when YT.Player constructor throws synchronously", async () => {
    const PlayerState = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 } as const;
    const ThrowingCtor: unknown = function () {
      throw new Error("YT ctor blew up");
    };
    const runtime: YouTubeRuntime = {
      Player: ThrowingCtor as YouTubeRuntime["Player"],
      PlayerState,
    };
    const provider = createYouTubeProvider({ loadRuntime: () => Promise.resolve(runtime) });
    const loader = provider.createLoader();
    await expect(loader.attach(video, { src: "https://youtube.com/watch?v=abc" })).rejects.toThrow(
      /YT ctor blew up/,
    );
  });

  it("bridges polled getCurrentTime via onTimeUpdate (A3)", async () => {
    vi.useFakeTimers();
    try {
      const onTimeUpdate = vi.fn();
      const { runtime, instances } = makeRuntime();
      const provider = createYouTubeProvider({
        loadRuntime: () => Promise.resolve(runtime),
        onTimeUpdate,
        timeBridgeIntervalMs: 50,
      });
      const loader = provider.createLoader();
      const attachP = loader.attach(video, { src: "https://youtube.com/watch?v=abc" });
      await vi.advanceTimersByTimeAsync(0);
      await attachP;
      const inst = instances[0] as unknown as { _setNow(t: number): void };
      inst._setNow(7.5);
      vi.advanceTimersByTime(60);
      expect(onTimeUpdate).toHaveBeenCalledWith(7.5);
      inst._setNow(8.25);
      vi.advanceTimersByTime(60);
      expect(onTimeUpdate).toHaveBeenLastCalledWith(8.25);
      loader.detach();
    } finally {
      vi.useRealTimers();
    }
  });

  it("emits onDuration once duration becomes available (A3)", async () => {
    vi.useFakeTimers();
    try {
      const onDuration = vi.fn();
      const PlayerState = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 } as const;
      class WithDurationCtor {
        private _now = 0;
        constructor(
          _el: HTMLElement,
          options: { events?: { onReady?: (e: { target: WithDurationCtor }) => void } },
        ) {
          queueMicrotask(() => options.events?.onReady?.({ target: this }));
        }
        playVideo() {}
        pauseVideo() {}
        seekTo() {}
        getCurrentTime() {
          return this._now;
        }
        getDuration() {
          return 120;
        }
        getPlayerState() {
          return PlayerState.PAUSED;
        }
        destroy() {}
      }
      const runtime: YouTubeRuntime = {
        Player: WithDurationCtor as unknown as YouTubeRuntime["Player"],
        PlayerState,
      };
      const provider = createYouTubeProvider({
        loadRuntime: () => Promise.resolve(runtime),
        onDuration,
      });
      const loader = provider.createLoader();
      const attachP = loader.attach(video, { src: "https://youtube.com/watch?v=abc" });
      await vi.advanceTimersByTimeAsync(0);
      await attachP;
      expect(onDuration).toHaveBeenCalledWith(120);
      loader.detach();
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects pending attach Promise on abort() (A4 contract)", async () => {
    const PlayerState = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 } as const;
    // A constructor that NEVER fires onReady so the attach Promise stays pending.
    class HangingCtor {
      constructor() {}
      playVideo() {}
      pauseVideo() {}
      seekTo() {}
      getCurrentTime() {
        return 0;
      }
      getDuration() {
        return 0;
      }
      getPlayerState() {
        return 0;
      }
      destroy() {}
    }
    const runtime: YouTubeRuntime = {
      Player: HangingCtor as unknown as YouTubeRuntime["Player"],
      PlayerState,
    };
    const provider = createYouTubeProvider({ loadRuntime: () => Promise.resolve(runtime) });
    const loader = provider.createLoader();
    const attachP = loader.attach(video, { src: "https://youtube.com/watch?v=abc" });
    await Promise.resolve();
    loader.abort?.();
    await expect(attachP).rejects.toThrow(/aborted/i);
  });

  it("exposes the underlying YT instance via _instance() escape hatch", async () => {
    const { runtime, instances } = makeRuntime();
    const provider = createYouTubeProvider({ loadRuntime: () => Promise.resolve(runtime) });
    const loader = provider.createLoader() as unknown as {
      _instance(): YouTubePlayerInstance | null;
      attach(v: HTMLVideoElement, s: { src: string }): Promise<void>;
      detach(): void;
    };
    expect(loader._instance()).toBeNull();
    await loader.attach(video, { src: "https://youtube.com/watch?v=abc" });
    expect(loader._instance()).toBe(instances[0]);
    loader.detach();
    expect(loader._instance()).toBeNull();
  });
});
