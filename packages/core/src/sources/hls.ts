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

class HlsLoader implements SourceLoader {
  private hls: HlsInstance | null = null;
  private video: HTMLVideoElement | null = null;
  private detachListeners: Array<() => void> = [];
  private qualities: QualityLevel[] = [];
  private currentSource: SourceDescriptor | null = null;
  private unauthorizedFired = false;

  constructor(private readonly options: HlsProviderOptions) {}

  async attach(video: HTMLVideoElement, source: SourceDescriptor): Promise<void> {
    this.detach();
    this.video = video;
    this.currentSource = source;
    this.unauthorizedFired = false;

    const Hls = await (this.options.loadRuntime ?? defaultLoad)();

    if (!Hls.isSupported()) {
      // Native HLS path (Safari): fall back to setting `<video>.src`.
      return new Promise((resolve, reject) => {
        const onMeta = (): void => {
          video.removeEventListener("loadedmetadata", onMeta);
          video.removeEventListener("error", onError);
          resolve();
        };
        const onError = (): void => {
          video.removeEventListener("loadedmetadata", onMeta);
          video.removeEventListener("error", onError);
          reject(new Error("Native HLS playback failed"));
        };
        video.addEventListener("loadedmetadata", onMeta);
        video.addEventListener("error", onError);
        video.src = source.src;
        video.load();
      });
    }

    const hls = new Hls({
      enableWorker: true,
      xhrSetup: (xhr, url) => {
        if (resolveWithCredentials(source.withCredentials, url)) {
          xhr.withCredentials = true;
        }
        const watcher = (): void => {
          if (xhr.readyState !== 4) return;
          if ((xhr.status === 401 || xhr.status === 403) && !this.unauthorizedFired) {
            this.unauthorizedFired = true;
            this.options.onUnauthorized?.({
              url,
              status: xhr.status as 401 | 403,
              source,
            });
          }
        };
        xhr.addEventListener("readystatechange", watcher);
      },
    });

    this.hls = hls;

    return new Promise<void>((resolve, reject) => {
      const onParsed = (): void => {
        this.refreshQualities();
        resolve();
      };
      const onSwitched = (): void => {
        this.refreshActiveQuality();
      };
      const onError = (..._args: unknown[]): void => {
        const data = (_args[1] ?? {}) as {
          type?: string;
          fatal?: boolean;
          response?: { code?: number; url?: string };
          url?: string;
        };
        if (data.fatal) {
          this.options.onError?.({
            message: `HLS fatal error: ${data.type ?? "unknown"}`,
            cause: data,
            status: data.response?.code,
            url: data.response?.url ?? data.url,
          });
          reject(new Error(`HLS fatal: ${data.type ?? "unknown"}`));
        }
      };

      hls.on(Hls.Events.MANIFEST_PARSED, onParsed);
      hls.on(Hls.Events.LEVEL_SWITCHED, onSwitched);
      hls.on(Hls.Events.ERROR, onError);

      this.detachListeners.push(
        () => hls.off(Hls.Events.MANIFEST_PARSED, onParsed),
        () => hls.off(Hls.Events.LEVEL_SWITCHED, onSwitched),
        () => hls.off(Hls.Events.ERROR, onError),
      );

      hls.loadSource(source.src);
      hls.attachMedia(video);
    });
  }

  detach(): void {
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
  }

  getQualities(): QualityLevel[] {
    return this.qualities.slice();
  }

  setQuality(level: QualityLevel | "auto"): void {
    if (!this.hls) return;
    if (level === "auto") {
      this.hls.currentLevel = -1;
      this.options.onActiveQuality?.(null, true);
      return;
    }
    const idx = this.qualities.findIndex((q) => q.id === level.id);
    if (idx >= 0) {
      this.hls.currentLevel = idx;
      this.options.onActiveQuality?.(level, false);
    }
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
