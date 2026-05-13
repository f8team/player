/**
 * HLS source provider. Lazy-loads `hls.js` on first attach.
 *
 * Golden cases:
 * - G1 / G2: HLS playback with `playsInline` on iOS WebKit.
 * - G7: HLS quality menu (variant levels).
 * - G13: 401/403 surfacing via `xhrSetup` + readystatechange hook.
 * - G14: forces hls.js even on Safari iOS so the manifest goes through xhrSetup.
 */

import {
  type QualityLevel,
  type SourceDescriptor,
  type SourceLoader,
  type SourceProvider,
} from "../types/source.js";
import { detectSourceType, looksLikeHls, resolveWithCredentials } from "../util/url.js";

/**
 * Subset of the `hls.js` runtime surface we touch. Defining it here lets
 * tests inject a mock without depending on the actual `hls.js` package
 * being installed.
 */
export interface HlsRuntime {
  isSupported: () => boolean;
  Events: {
    MANIFEST_PARSED: string;
    LEVEL_SWITCHED: string;
    ERROR: string;
  };
  ErrorTypes: { NETWORK_ERROR: string };
  /** Constructor signature is on the default export when imported as a module. */
  new (config?: HlsConfig): HlsInstance;
}

/** Minimal config shape we set on the HLS instance. */
export interface HlsConfig {
  xhrSetup?: (xhr: XMLHttpRequest, url: string) => void;
  enableWorker?: boolean;
  startPosition?: number;
}

/** Minimal instance shape we touch. */
export interface HlsInstance {
  loadSource(url: string): void;
  attachMedia(video: HTMLVideoElement): void;
  detachMedia(): void;
  destroy(): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
  levels: HlsLevel[];
  currentLevel: number;
}

interface HlsLevel {
  height?: number;
  bitrate?: number;
  name?: string;
}

/** Options handed to `createHlsProvider`. */
export interface HlsProviderOptions {
  /**
   * Override the dynamic loader. Default: `() => import("hls.js").then(m => m.default)`.
   * Tests inject a mock; consumers can swap to a self-hosted SDK.
   */
  loadRuntime?: () => Promise<HlsRuntime>;
  /** Surface 401/403 to the core. */
  onUnauthorized?: (event: { url: string; status: 401 | 403; source: SourceDescriptor }) => void;
  /** Notify the core when the level list changes. */
  onQualities?: (qualities: QualityLevel[]) => void;
  /** Notify the core when the active level changes. */
  onActiveQuality?: (quality: QualityLevel | null, auto: boolean) => void;
  /** Surface a load error to the core. */
  onError?: (error: { message: string; cause?: unknown; status?: number; url?: string }) => void;
  /** Spinner / overlay: `true` when a user-driven rendition change is in-flight. */
  onQualitySwitch?: (active: boolean) => void;
  /**
   * Reject the manifest-load Promise if `MANIFEST_PARSED` does not fire within
   * this many milliseconds. Defaults to 30000 (30s). Set to `0` to disable.
   *
   * Without a timeout, a stalled or non-fatal HLS error can leave the player
   * stuck in `loading` forever (A2 in the 2026-05-12 review).
   */
  manifestTimeoutMs?: number;
}

// Dynamic import of hls.js. Using a regular import() (not `new Function`) so
// that webpack/CRA can discover and bundle hls.js as a lazy chunk at compile
// time. The `new Function` trick intentionally escapes static-analysis passes
// (Vite, esbuild, Rollup) but breaks webpack because webpack cannot see the
// specifier inside the function string and therefore never emits a chunk —
// the browser's native import("hls.js") fails with "Failed to resolve module
// specifier". Tests still inject a mock via `loadRuntime`.

/* c8 ignore start — only exercised in real browsers; tests inject `loadRuntime`. */
const defaultLoad = (): Promise<HlsRuntime> => {
  return import("hls.js").then((m) => (m as unknown as { default: HlsRuntime }).default);
};
/* c8 ignore stop */

/**
 * Construct an AbortError-shaped Error so callers can branch on `name` like
 * the standard Fetch API. We don't depend on DOMException because Node.js
 * unit tests run without it.
 */
function makeAbortError(): Error {
  const err = new Error("HLS loader aborted");
  err.name = "AbortError";
  return err;
}

class HlsLoader implements SourceLoader {
  private hls: HlsInstance | null = null;
  private video: HTMLVideoElement | null = null;
  private detachListeners: Array<() => void> = [];
  private qualities: QualityLevel[] = [];
  private currentSource: SourceDescriptor | null = null;
  private unauthorizedFired = false;
  // Track every XHR that hls.js spawns so we can abort and remove their
  // readystatechange watcher on `abort()` / `detach()`. Without this set the
  // watcher closure leaks for every media segment (A1 in the review).
  private liveXhrs: Set<XMLHttpRequest> = new Set();
  private rejectAttach: ((err: Error) => void) | null = null;
  private manifestTimeout: ReturnType<typeof setTimeout> | null = null;
  private aborted = false;

  /** `false` idle; `'auto'` → first `LEVEL_SWITCHED` clears; otherwise await this level index. */
  private qualityAwait: false | "auto" | number = false;
  private qualitySwitchTimer: ReturnType<typeof setTimeout> | null = null;

  /** Tracks consecutive menu selections so redundant "Auto → Auto" skips the spinner. */
  private lastChosenQualityWasAuto = false;

  constructor(private readonly options: HlsProviderOptions) {}

  async attach(video: HTMLVideoElement, source: SourceDescriptor): Promise<void> {
    this.detach();
    this.aborted = false;
    this.video = video;
    this.currentSource = source;
    this.unauthorizedFired = false;

    const Hls = await (this.options.loadRuntime ?? defaultLoad)();
    if (this.aborted) {
      throw makeAbortError();
    }

    if (!Hls.isSupported()) {
      return this.attachNative(video, source);
    }

    return this.attachWithHlsJs(Hls, video, source);
  }

  /**
   * Native-HLS branch (Safari iOS / desktop without MSE). Listeners are
   * pushed into `detachListeners` so that an early `detach()` / `abort()`
   * cleans them up instead of leaking (C3 in the review).
   */
  private attachNative(video: HTMLVideoElement, source: SourceDescriptor): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.rejectAttach = reject;
      let settled = false;
      const settle = (run: () => void): void => {
        if (settled) return;
        settled = true;
        run();
      };
      const onMeta = (): void => settle(() => resolve());
      const onError = (): void => settle(() => reject(new Error("Native HLS playback failed")));
      video.addEventListener("loadedmetadata", onMeta);
      video.addEventListener("error", onError);
      this.detachListeners.push(
        () => video.removeEventListener("loadedmetadata", onMeta),
        () => video.removeEventListener("error", onError),
        () =>
          settle(() => {
            // If `detach()` runs before either event fires, reject so callers
            // (createPlayer) can stop waiting on the stale Promise.
            reject(makeAbortError());
          }),
      );
      try {
        video.src = source.src;
        video.load();
      } catch (err) {
        settle(() => reject(err instanceof Error ? err : new Error(String(err))));
      }
    });
  }

  private attachWithHlsJs(
    Hls: HlsRuntime,
    video: HTMLVideoElement,
    source: SourceDescriptor,
  ): Promise<void> {
    const hls = new Hls({
      enableWorker: true,
      xhrSetup: (xhr, url) => this.installXhrWatcher(xhr, url, source),
    });
    this.hls = hls;

    return new Promise<void>((resolve, reject) => {
      this.rejectAttach = reject;
      let settled = false;
      const settle = (run: () => void): void => {
        if (settled) return;
        settled = true;
        this.clearManifestTimeout();
        run();
      };

      const onParsed = (): void => {
        this.refreshQualities();
        settle(() => resolve());
      };
      const onSwitched = (...args: unknown[]): void => {
        this.onLevelEventuallyStabilized(...args);
        this.refreshActiveQuality();
      };
      const onError = (..._args: unknown[]): void => {
        const data = (_args[1] ?? {}) as {
          type?: string;
          fatal?: boolean;
          response?: { code?: number; url?: string };
          url?: string;
        };
        const status = data.response?.code;
        // 4xx/5xx surface as an error even if hls.js classifies them as
        // non-fatal — the player would otherwise sit in `loading` waiting
        // for a manifest that will never parse (A2).
        const isHttpError = typeof status === "number" && status >= 400;
        if (data.fatal || isHttpError) {
          const message = data.fatal
            ? `HLS fatal error: ${data.type ?? "unknown"}`
            : `HLS load error: HTTP ${status}`;
          this.options.onError?.({
            message,
            cause: data,
            status,
            url: data.response?.url ?? data.url,
          });
          settle(() => reject(new Error(message)));
        }
      };

      hls.on(Hls.Events.MANIFEST_PARSED, onParsed);
      hls.on(Hls.Events.LEVEL_SWITCHED, onSwitched);
      hls.on(Hls.Events.ERROR, onError);

      this.detachListeners.push(
        () => hls.off(Hls.Events.MANIFEST_PARSED, onParsed),
        () => hls.off(Hls.Events.LEVEL_SWITCHED, onSwitched),
        () => hls.off(Hls.Events.ERROR, onError),
        () => settle(() => reject(makeAbortError())),
      );

      const timeoutMs = this.options.manifestTimeoutMs ?? 30_000;
      if (timeoutMs > 0) {
        this.manifestTimeout = setTimeout(() => {
          const message = `HLS manifest timeout after ${timeoutMs}ms`;
          this.options.onError?.({ message, cause: { type: "timeout" }, url: source.src });
          settle(() => reject(new Error(message)));
        }, timeoutMs);
      }

      try {
        hls.loadSource(source.src);
        hls.attachMedia(video);
      } catch (err) {
        settle(() => reject(err instanceof Error ? err : new Error(String(err))));
      }
    });
  }

  /**
   * Wire the readystatechange watcher and remove it as soon as the XHR
   * completes — without this cleanup hls.js (which spawns one XHR per segment)
   * leaks a closure per request (A1).
   */
  private installXhrWatcher(xhr: XMLHttpRequest, url: string, source: SourceDescriptor): void {
    if (resolveWithCredentials(source.withCredentials, url)) {
      xhr.withCredentials = true;
    }
    this.liveXhrs.add(xhr);
    const watcher = (): void => {
      if (xhr.readyState !== 4) return;
      try {
        if ((xhr.status === 401 || xhr.status === 403) && !this.unauthorizedFired) {
          this.unauthorizedFired = true;
          this.options.onUnauthorized?.({
            url,
            status: xhr.status as 401 | 403,
            source,
          });
        }
      } finally {
        xhr.removeEventListener("readystatechange", watcher);
        this.liveXhrs.delete(xhr);
      }
    };
    xhr.addEventListener("readystatechange", watcher);
  }

  abort(): void {
    if (this.aborted) return;
    this.aborted = true;
    this.clearManifestTimeout();
    // Cancel every in-flight XHR. The watcher's `readystatechange` fires
    // synchronously on `abort()` with `readyState === 4`, which removes it
    // from `liveXhrs` for us; but be defensive.
    for (const xhr of [...this.liveXhrs]) {
      try {
        xhr.abort();
      } catch {
        // ignore
      }
    }
    this.liveXhrs.clear();
    // Reject the pending attach Promise (if any) so callers stop waiting.
    const reject = this.rejectAttach;
    this.rejectAttach = null;
    reject?.(makeAbortError());
  }

  detach(): void {
    this.completeQualityAwaitIfBusy();
    // `abort()` first so the in-flight Promise is rejected before we tear
    // down the underlying engine.
    this.abort();
    while (this.detachListeners.length) {
      try {
        this.detachListeners.pop()?.();
      } catch {
        // ignore
      }
    }
    if (this.hls) {
      try {
        this.hls.detachMedia();
        this.hls.destroy();
      } catch {
        // ignore
      }
      this.hls = null;
    }
    if (this.video) {
      try {
        this.video.removeAttribute("src");
        this.video.load();
      } catch {
        // ignore
      }
      this.video = null;
    }
    this.qualities = [];
    this.currentSource = null;
    this.unauthorizedFired = false;
    this.aborted = false; // reset so the loader can be reused
    this.lastChosenQualityWasAuto = false;
  }

  private clearQualitySwitchTimerOnly(): void {
    if (this.qualitySwitchTimer !== null) {
      clearTimeout(this.qualitySwitchTimer);
      this.qualitySwitchTimer = null;
    }
  }

  private armQualitySwitchTimeout(): void {
    this.clearQualitySwitchTimerOnly();
    this.qualitySwitchTimer = setTimeout(() => {
      this.qualitySwitchTimer = null;
      if (this.qualityAwait !== false) {
        this.completeQualityAwaitIfBusy();
      }
    }, 12_000);
  }

  /** Start or refresh awaited UI for a rendition change (rapid toggles reuse one spinner). */
  private armQualityAwait(kind: Exclude<typeof this.qualityAwait, false>): void {
    const wasIdle = this.qualityAwait === false;
    this.qualityAwait = kind;
    if (wasIdle) this.options.onQualitySwitch?.(true);
    this.armQualitySwitchTimeout();
  }

  private resolveQualityAwaitIfDone(levelIdx: number): void {
    const awaiting = this.qualityAwait;
    if (awaiting === false) return;

    const done =
      awaiting === "auto" ||
      (typeof awaiting === "number" && awaiting === levelIdx);

    if (done) this.completeQualityAwaitIfBusy();
  }

  private onLevelEventuallyStabilized(...args: unknown[]): void {
    let levelIdx: number | undefined;
    for (let i = args.length - 1; i >= 0; i--) {
      const a = args[i];
      if (a !== null && typeof a === "object" && typeof (a as { level?: unknown }).level === "number") {
        levelIdx = (a as { level: number }).level;
        break;
      }
    }
    if (levelIdx === undefined) levelIdx = this.hls?.currentLevel;
    if (typeof levelIdx === "number") this.resolveQualityAwaitIfDone(levelIdx);
  }

  private completeQualityAwaitIfBusy(): void {
    if (this.qualityAwait === false) return;
    this.qualityAwait = false;
    this.clearQualitySwitchTimerOnly();
    this.options.onQualitySwitch?.(false);
  }

  private clearManifestTimeout(): void {
    if (this.manifestTimeout !== null) {
      clearTimeout(this.manifestTimeout);
      this.manifestTimeout = null;
    }
  }

  getQualities(): QualityLevel[] {
    return this.qualities.slice();
  }

  setQuality(level: QualityLevel | "auto"): void {
    if (!this.hls) return;
    if (level === "auto") {
      this.hls.currentLevel = -1;
      this.options.onActiveQuality?.(null, true);
      if (!this.lastChosenQualityWasAuto) {
        this.armQualityAwait("auto");
      }
      this.lastChosenQualityWasAuto = true;
      return;
    }
    const idx = this.qualities.findIndex((q) => q.id === level.id);
    if (idx < 0) return;
    this.lastChosenQualityWasAuto = false;
    if (this.hls.currentLevel === idx) {
      this.options.onActiveQuality?.(level, false);
      return;
    }
    this.armQualityAwait(idx);
    this.hls.currentLevel = idx;
    this.options.onActiveQuality?.(level, false);
  }

  private refreshQualities(): void {
    if (!this.hls) return;
    const next: QualityLevel[] = this.hls.levels.map((lvl, i) => ({
      id: String(i),
      height: lvl.height ?? 0,
      bitrate: lvl.bitrate ?? 0,
      label: lvl.name ?? (lvl.height ? `${lvl.height}p` : `Level ${i + 1}`),
    }));
    this.qualities = next;
    this.options.onQualities?.(next);
    this.refreshActiveQuality();
  }

  private refreshActiveQuality(): void {
    if (!this.hls) return;
    const idx = this.hls.currentLevel;
    const quality = idx >= 0 ? (this.qualities[idx] ?? null) : null;
    this.options.onActiveQuality?.(quality, idx === -1);
  }

  /** @internal — for tests. */
  _getInternalState(): { source: SourceDescriptor | null; qualities: QualityLevel[] } {
    return { source: this.currentSource, qualities: this.qualities };
  }
}

/**
 * Build the HLS source provider with bound core callbacks.
 */
export function createHlsProvider(options: HlsProviderOptions = {}): SourceProvider {
  return {
    name: "hls",
    canHandle: (source) => {
      if (source.type === "hls") return true;
      const type = detectSourceType(source);
      return type === "hls" || (type === "auto" && looksLikeHls(source.src));
    },
    createLoader: () => new HlsLoader(options),
  };
}
