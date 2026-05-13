import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHlsProvider, type HlsConfig, type HlsInstance, type HlsRuntime } from "./hls.js";

/* ------------------------------------------------------------------ */
/* Mock hls.js runtime                                                 */
/* ------------------------------------------------------------------ */

const HLS_EVENTS = {
  MANIFEST_PARSED: "hlsManifestParsed",
  LEVEL_SWITCHED: "hlsLevelSwitched",
  ERROR: "hlsError",
};

interface MockHlsInstance extends HlsInstance {
  emit(event: string, ...args: unknown[]): void;
  triggerXhr(url: string, status: number): void;
  config: HlsConfig;
  loadedSrc: string | null;
  attachedVideo: HTMLVideoElement | null;
  destroyed: boolean;
}

function makeMockRuntime(opts: { isSupported?: boolean } = {}): HlsRuntime {
  const isSupported = opts.isSupported ?? true;
  const handlers = new Map<string, Set<(...args: unknown[]) => void>>();

  class MockHls implements MockHlsInstance {
    config: HlsConfig;
    levels: { height?: number; bitrate?: number; name?: string }[] = [];
    currentLevel = -1;
    loadedSrc: string | null = null;
    attachedVideo: HTMLVideoElement | null = null;
    destroyed = false;

    constructor(config?: HlsConfig) {
      this.config = config ?? {};
    }
    on(event: string, handler: (...args: unknown[]) => void): void {
      let set = handlers.get(event);
      if (!set) {
        set = new Set();
        handlers.set(event, set);
      }
      set.add(handler);
    }
    off(event: string, handler: (...args: unknown[]) => void): void {
      handlers.get(event)?.delete(handler);
    }
    emit(event: string, ...args: unknown[]): void {
      handlers.get(event)?.forEach((h) => h(...args));
    }
    loadSource(url: string): void {
      this.loadedSrc = url;
    }
    attachMedia(video: HTMLVideoElement): void {
      this.attachedVideo = video;
    }
    detachMedia(): void {
      this.attachedVideo = null;
    }
    destroy(): void {
      this.destroyed = true;
      handlers.clear();
    }
    triggerXhr(url: string, status: number): void {
      if (!this.config.xhrSetup) return;
      const xhr = new XMLHttpRequest();
      Object.defineProperty(xhr, "readyState", { configurable: true, value: 4 });
      Object.defineProperty(xhr, "status", { configurable: true, value: status });
      this.config.xhrSetup(xhr, url);
      xhr.dispatchEvent(new Event("readystatechange"));
    }
  }

  const Hls = MockHls as unknown as HlsRuntime;
  (Hls as unknown as { isSupported: () => boolean }).isSupported = () => isSupported;
  (Hls as unknown as { Events: typeof HLS_EVENTS }).Events = HLS_EVENTS;
  (Hls as unknown as { ErrorTypes: { NETWORK_ERROR: string } }).ErrorTypes = {
    NETWORK_ERROR: "networkError",
  };
  return Hls;
}

/* ------------------------------------------------------------------ */
/* Tests                                                                */
/* ------------------------------------------------------------------ */

describe("createHlsProvider — canHandle", () => {
  const provider = createHlsProvider();

  it("matches HLS URLs", () => {
    expect(provider.canHandle({ src: "https://x.com/master.m3u8" })).toBe(true);
  });

  it("matches type='hls' explicitly", () => {
    expect(provider.canHandle({ src: "https://x.com/file.mp4", type: "hls" })).toBe(true);
  });

  it("rejects non-HLS sources", () => {
    expect(provider.canHandle({ src: "https://x.com/file.mp4" })).toBe(false);
    expect(provider.canHandle({ src: "https://youtube.com/watch?v=abc" })).toBe(false);
  });
});

describe("createHlsProvider — loader lifecycle", () => {
  let video: HTMLVideoElement;
  let runtime: HlsRuntime;

  beforeEach(() => {
    video = document.createElement("video");
    document.body.appendChild(video);
    runtime = makeMockRuntime();
  });

  afterEach(() => {
    video.remove();
  });

  it("loads the runtime, attaches media, and resolves on MANIFEST_PARSED", async () => {
    const onQualities = vi.fn();
    const onActiveQuality = vi.fn();
    const provider = createHlsProvider({
      loadRuntime: () => Promise.resolve(runtime),
      onQualities,
      onActiveQuality,
    });
    const loader = provider.createLoader();

    const promise = loader.attach(video, { src: "https://x.com/master.m3u8" });

    // Wait for the runtime to be loaded and Hls instance to exist.
    await Promise.resolve();
    await Promise.resolve();

    const instance = (loader as unknown as { hls: MockHlsInstance }).hls;
    expect(instance).toBeDefined();
    expect(instance.loadedSrc).toBe("https://x.com/master.m3u8");
    expect(instance.attachedVideo).toBe(video);

    // Populate levels and fire MANIFEST_PARSED.
    instance.levels = [
      { height: 360, bitrate: 800_000, name: "360p" },
      { height: 720, bitrate: 2_500_000 },
    ];
    instance.emit(HLS_EVENTS.MANIFEST_PARSED);

    await expect(promise).resolves.toBeUndefined();
    expect(onQualities).toHaveBeenCalledWith([
      { id: "0", height: 360, bitrate: 800_000, label: "360p" },
      { id: "1", height: 720, bitrate: 2_500_000, label: "720p" },
    ]);
    expect(onActiveQuality).toHaveBeenCalledWith(null, true);
  });

  it("forwards withCredentials boolean to xhrSetup", async () => {
    const provider = createHlsProvider({ loadRuntime: () => Promise.resolve(runtime) });
    const loader = provider.createLoader();
    void loader.attach(video, {
      src: "https://x.com/master.m3u8",
      withCredentials: true,
    });
    await Promise.resolve();
    await Promise.resolve();

    const instance = (loader as unknown as { hls: MockHlsInstance }).hls;
    const xhr = new XMLHttpRequest();
    instance.config.xhrSetup?.(xhr, "https://x.com/segment-1.ts");
    expect(xhr.withCredentials).toBe(true);
  });

  it("forwards withCredentials predicate to xhrSetup (allowlist)", async () => {
    const provider = createHlsProvider({ loadRuntime: () => Promise.resolve(runtime) });
    const loader = provider.createLoader();
    void loader.attach(video, {
      src: "https://api-gateway.example.com/master.m3u8",
      withCredentials: (url) => url.startsWith("https://api-gateway"),
    });
    await Promise.resolve();
    await Promise.resolve();

    const instance = (loader as unknown as { hls: MockHlsInstance }).hls;
    const xhrAllowed = new XMLHttpRequest();
    instance.config.xhrSetup?.(xhrAllowed, "https://api-gateway.example.com/seg.ts");
    expect(xhrAllowed.withCredentials).toBe(true);

    const xhrDenied = new XMLHttpRequest();
    instance.config.xhrSetup?.(xhrDenied, "https://cdn.example.com/seg.ts");
    expect(xhrDenied.withCredentials).toBe(false);
  });

  it("surfaces 401/403 once per source via onUnauthorized", async () => {
    const onUnauthorized = vi.fn();
    const provider = createHlsProvider({
      loadRuntime: () => Promise.resolve(runtime),
      onUnauthorized,
    });
    const loader = provider.createLoader();
    void loader.attach(video, { src: "https://x.com/master.m3u8" });
    await Promise.resolve();
    await Promise.resolve();

    const instance = (loader as unknown as { hls: MockHlsInstance }).hls;
    instance.triggerXhr("https://x.com/seg-1.ts", 401);
    instance.triggerXhr("https://x.com/seg-2.ts", 401);
    instance.triggerXhr("https://x.com/seg-3.ts", 403);

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledWith({
      url: "https://x.com/seg-1.ts",
      status: 401,
      source: { src: "https://x.com/master.m3u8" },
    });
  });

  it("re-arms onUnauthorized after detach + attach with a new source", async () => {
    const onUnauthorized = vi.fn();
    const provider = createHlsProvider({
      loadRuntime: () => Promise.resolve(runtime),
      onUnauthorized,
    });
    const loader = provider.createLoader();

    void loader.attach(video, { src: "https://x.com/a.m3u8" });
    await Promise.resolve();
    await Promise.resolve();
    let instance = (loader as unknown as { hls: MockHlsInstance }).hls;
    instance.triggerXhr("https://x.com/seg1.ts", 401);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);

    // re-attach a new runtime
    const runtime2 = makeMockRuntime();
    const provider2 = createHlsProvider({
      loadRuntime: () => Promise.resolve(runtime2),
      onUnauthorized,
    });
    const loader2 = provider2.createLoader();
    void loader2.attach(video, { src: "https://x.com/b.m3u8" });
    await Promise.resolve();
    await Promise.resolve();
    instance = (loader2 as unknown as { hls: MockHlsInstance }).hls;
    instance.triggerXhr("https://x.com/seg2.ts", 403);
    expect(onUnauthorized).toHaveBeenCalledTimes(2);
  });

  it("surfaces fatal HLS errors via onError + rejects the attach promise", async () => {
    const onError = vi.fn();
    const provider = createHlsProvider({
      loadRuntime: () => Promise.resolve(runtime),
      onError,
    });
    const loader = provider.createLoader();
    const promise = loader.attach(video, { src: "https://x.com/master.m3u8" });
    await Promise.resolve();
    await Promise.resolve();
    const instance = (loader as unknown as { hls: MockHlsInstance }).hls;
    instance.emit(HLS_EVENTS.ERROR, undefined, {
      type: "networkError",
      fatal: true,
      response: { code: 500, url: "https://x.com/master.m3u8" },
    });
    await expect(promise).rejects.toThrow(/HLS fatal/);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ status: 500, url: "https://x.com/master.m3u8" }),
    );
  });

  it("getQualities and setQuality bridge to hls.currentLevel", async () => {
    const onActiveQuality = vi.fn();
    const onQualitySwitch = vi.fn();
    const provider = createHlsProvider({
      loadRuntime: () => Promise.resolve(runtime),
      onActiveQuality,
      onQualitySwitch,
    });
    const loader = provider.createLoader();
    void loader.attach(video, { src: "https://x.com/master.m3u8" });
    await Promise.resolve();
    await Promise.resolve();
    const instance = (loader as unknown as { hls: MockHlsInstance }).hls;
    instance.levels = [
      { height: 360, bitrate: 800_000, name: "360p" },
      { height: 720, bitrate: 2_500_000 },
    ];
    instance.emit(HLS_EVENTS.MANIFEST_PARSED);

    const qualities = loader.getQualities?.() ?? [];
    expect(qualities).toHaveLength(2);

    loader.setQuality?.(qualities[1]!);
    expect(instance.currentLevel).toBe(1);
    expect(onActiveQuality).toHaveBeenLastCalledWith(qualities[1], false);
    expect(onQualitySwitch).toHaveBeenCalledWith(true);
    instance.emit(HLS_EVENTS.LEVEL_SWITCHED, {}, { level: 1 });
    expect(onQualitySwitch).toHaveBeenLastCalledWith(false);

    loader.setQuality?.("auto");
    expect(instance.currentLevel).toBe(-1);
    expect(onActiveQuality).toHaveBeenLastCalledWith(null, true);
    expect(onQualitySwitch).toHaveBeenLastCalledWith(true);
    instance.emit(HLS_EVENTS.LEVEL_SWITCHED, {}, { level: 0 });
    expect(onQualitySwitch).toHaveBeenLastCalledWith(false);

    onQualitySwitch.mockClear();
    loader.setQuality?.("auto");
    expect(onQualitySwitch).not.toHaveBeenCalled();
  });

  it("falls back to native HLS when isSupported() === false", async () => {
    const nativeRuntime = makeMockRuntime({ isSupported: false });
    const provider = createHlsProvider({ loadRuntime: () => Promise.resolve(nativeRuntime) });
    const loader = provider.createLoader();
    const promise = loader.attach(video, { src: "https://x.com/master.m3u8" });
    await Promise.resolve();
    queueMicrotask(() => video.dispatchEvent(new Event("loadedmetadata")));
    await expect(promise).resolves.toBeUndefined();
    expect(video.src).toContain("master.m3u8");
  });

  it("native HLS path rejects when <video> fires error before loadedmetadata", async () => {
    const nativeRuntime = makeMockRuntime({ isSupported: false });
    const provider = createHlsProvider({ loadRuntime: () => Promise.resolve(nativeRuntime) });
    const loader = provider.createLoader();
    const promise = loader.attach(video, { src: "https://x.com/master.m3u8" });
    await Promise.resolve();
    queueMicrotask(() => video.dispatchEvent(new Event("error")));
    await expect(promise).rejects.toThrow(/Native HLS playback failed/);
  });

  it("detach destroys the hls instance and clears state", async () => {
    const provider = createHlsProvider({ loadRuntime: () => Promise.resolve(runtime) });
    const loader = provider.createLoader();
    void loader.attach(video, { src: "https://x.com/master.m3u8" });
    await Promise.resolve();
    await Promise.resolve();
    const instance = (loader as unknown as { hls: MockHlsInstance }).hls;
    instance.emit(HLS_EVENTS.MANIFEST_PARSED);
    loader.detach();
    expect(instance.destroyed).toBe(true);
  });

  it("LEVEL_SWITCHED updates the active quality", async () => {
    const onActiveQuality = vi.fn();
    const provider = createHlsProvider({
      loadRuntime: () => Promise.resolve(runtime),
      onActiveQuality,
    });
    const loader = provider.createLoader();
    void loader.attach(video, { src: "https://x.com/master.m3u8" });
    await Promise.resolve();
    await Promise.resolve();
    const instance = (loader as unknown as { hls: MockHlsInstance }).hls;
    instance.levels = [{ height: 720, bitrate: 2_500_000 }];
    instance.emit(HLS_EVENTS.MANIFEST_PARSED);
    instance.currentLevel = 0;
    instance.emit(HLS_EVENTS.LEVEL_SWITCHED);
    expect(onActiveQuality).toHaveBeenLastCalledWith(
      { id: "0", height: 720, bitrate: 2_500_000, label: "720p" },
      false,
    );
  });

  it("setQuality with an unknown id is a no-op", async () => {
    const onActiveQuality = vi.fn();
    const provider = createHlsProvider({
      loadRuntime: () => Promise.resolve(runtime),
      onActiveQuality,
    });
    const loader = provider.createLoader();
    void loader.attach(video, { src: "https://x.com/master.m3u8" });
    await Promise.resolve();
    await Promise.resolve();
    const instance = (loader as unknown as { hls: MockHlsInstance }).hls;
    instance.levels = [{ height: 720, bitrate: 2_500_000 }];
    instance.emit(HLS_EVENTS.MANIFEST_PARSED);
    onActiveQuality.mockClear();
    loader.setQuality?.({ id: "999", height: 0, bitrate: 0, label: "x" });
    expect(instance.currentLevel).toBe(-1);
    expect(onActiveQuality).not.toHaveBeenCalled();
  });

  it("setQuality before attach is a no-op (no hls instance)", () => {
    const provider = createHlsProvider({ loadRuntime: () => Promise.resolve(runtime) });
    const loader = provider.createLoader();
    expect(() =>
      loader.setQuality?.({ id: "0", height: 720, bitrate: 100, label: "720p" }),
    ).not.toThrow();
    expect(() => loader.setQuality?.("auto")).not.toThrow();
  });

  it("detach swallows errors from hls.detachMedia / hls.destroy", async () => {
    const provider = createHlsProvider({ loadRuntime: () => Promise.resolve(runtime) });
    const loader = provider.createLoader();
    // attach() may reject with AbortError once detach() runs before
    // MANIFEST_PARSED — swallow it so vitest doesn't see an unhandled rejection.
    void loader.attach(video, { src: "https://x.com/master.m3u8" }).catch(() => undefined);
    await Promise.resolve();
    await Promise.resolve();
    const instance = (loader as unknown as { hls: MockHlsInstance }).hls;
    instance.detachMedia = () => {
      throw new Error("detachMedia blew up");
    };
    instance.destroy = () => {
      throw new Error("destroy blew up");
    };
    expect(() => loader.detach()).not.toThrow();
  });

  it("detach swallows errors from video.load() during cleanup", async () => {
    const provider = createHlsProvider({ loadRuntime: () => Promise.resolve(runtime) });
    const loader = provider.createLoader();
    void loader.attach(video, { src: "https://x.com/master.m3u8" }).catch(() => undefined);
    await Promise.resolve();
    await Promise.resolve();
    Object.defineProperty(video, "load", {
      configurable: true,
      value: () => {
        throw new Error("load blew up");
      },
    });
    expect(() => loader.detach()).not.toThrow();
  });

  it("removes the readystatechange watcher when the XHR completes (A1)", async () => {
    const provider = createHlsProvider({ loadRuntime: () => Promise.resolve(runtime) });
    const loader = provider.createLoader();
    void loader.attach(video, { src: "https://x.com/master.m3u8" }).catch(() => undefined);
    await Promise.resolve();
    await Promise.resolve();
    const instance = (loader as unknown as { hls: MockHlsInstance }).hls;

    const xhr = new XMLHttpRequest();
    Object.defineProperty(xhr, "readyState", { configurable: true, value: 0 });
    Object.defineProperty(xhr, "status", { configurable: true, value: 0 });
    const removeSpy = vi.spyOn(xhr, "removeEventListener");
    instance.config.xhrSetup?.(xhr, "https://x.com/seg-1.ts");

    // Simulate the XHR completing without 401/403.
    Object.defineProperty(xhr, "readyState", { configurable: true, value: 4 });
    Object.defineProperty(xhr, "status", { configurable: true, value: 200 });
    xhr.dispatchEvent(new Event("readystatechange"));

    expect(removeSpy).toHaveBeenCalledWith("readystatechange", expect.any(Function));
    expect((loader as unknown as { liveXhrs: Set<XMLHttpRequest> }).liveXhrs.has(xhr)).toBe(false);
  });

  it("aborts in-flight XHRs and rejects pending attach on abort() (A1)", async () => {
    const provider = createHlsProvider({ loadRuntime: () => Promise.resolve(runtime) });
    const loader = provider.createLoader();
    const attachPromise = loader.attach(video, { src: "https://x.com/master.m3u8" });
    await Promise.resolve();
    await Promise.resolve();
    const instance = (loader as unknown as { hls: MockHlsInstance }).hls;

    const xhr = new XMLHttpRequest();
    const abortSpy = vi.spyOn(xhr, "abort").mockImplementation(() => undefined);
    instance.config.xhrSetup?.(xhr, "https://x.com/seg-1.ts");

    loader.abort?.();
    expect(abortSpy).toHaveBeenCalled();
    await expect(attachPromise).rejects.toThrow(/aborted/i);
    abortSpy.mockRestore();
  });

  it("rejects on manifest timeout (A2)", async () => {
    vi.useFakeTimers();
    try {
      const onError = vi.fn();
      const provider = createHlsProvider({
        loadRuntime: () => Promise.resolve(runtime),
        onError,
        manifestTimeoutMs: 50,
      });
      const loader = provider.createLoader();
      const attachPromise = loader.attach(video, { src: "https://x.com/master.m3u8" });
      // Let the runtime resolve and Hls instance get constructed.
      await vi.advanceTimersByTimeAsync(0);
      vi.advanceTimersByTime(60);
      await expect(attachPromise).rejects.toThrow(/timeout/i);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/timeout/i) }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects on non-fatal HTTP 4xx error (A2)", async () => {
    const onError = vi.fn();
    const provider = createHlsProvider({
      loadRuntime: () => Promise.resolve(runtime),
      onError,
    });
    const loader = provider.createLoader();
    const attachPromise = loader.attach(video, { src: "https://x.com/master.m3u8" });
    await Promise.resolve();
    await Promise.resolve();
    const instance = (loader as unknown as { hls: MockHlsInstance }).hls;
    instance.emit(HLS_EVENTS.ERROR, "hlsError", {
      fatal: false,
      type: "networkError",
      response: { code: 404, url: "https://x.com/master.m3u8" },
    });
    await expect(attachPromise).rejects.toThrow(/HTTP 404/);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  });

  it("native fallback removes listeners on early detach (C3)", async () => {
    const nativeRuntime = makeMockRuntime({ isSupported: false });
    const provider = createHlsProvider({ loadRuntime: () => Promise.resolve(nativeRuntime) });
    const loader = provider.createLoader();
    const removeSpy = vi.spyOn(video, "removeEventListener");
    const attachPromise = loader
      .attach(video, { src: "https://x.com/master.m3u8" })
      .catch(() => undefined);
    await Promise.resolve();
    loader.detach();
    await attachPromise;
    expect(removeSpy).toHaveBeenCalledWith("loadedmetadata", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("_getInternalState exposes source + qualities for debugging", async () => {
    const provider = createHlsProvider({ loadRuntime: () => Promise.resolve(runtime) });
    const loader = provider.createLoader() as unknown as {
      _getInternalState(): { source: { src: string } | null; qualities: { id: string }[] };
      attach(v: HTMLVideoElement, s: { src: string }): Promise<void>;
      detach(): void;
    };
    expect(loader._getInternalState().source).toBeNull();
    void loader.attach(video, { src: "https://x.com/master.m3u8" });
    await Promise.resolve();
    await Promise.resolve();
    const instance = (loader as unknown as { hls: MockHlsInstance }).hls;
    instance.levels = [{ height: 720, bitrate: 2_500_000 }];
    instance.emit(HLS_EVENTS.MANIFEST_PARSED);
    const state = loader._getInternalState();
    expect(state.source?.src).toBe("https://x.com/master.m3u8");
    expect(state.qualities).toHaveLength(1);
    loader.detach();
    expect(loader._getInternalState().source).toBeNull();
  });
});
