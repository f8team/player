/**
 * YouTube source provider. Lazy-loads the IFrame Player API and bridges the
 * core `play / pause / seekTo / time` to a YT.Player instance hosted in an
 * off-DOM iframe parented to the player container.
 *
 * Golden case: G11 (admin upload preview).
 */

import { type SourceDescriptor, type SourceLoader, type SourceProvider } from "../types/source.js";
import { detectSourceType, looksLikeYouTube } from "../util/url.js";

/** Minimal subset of the YT.Player API we touch. */
export interface YouTubePlayerInstance {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
}

/** Subset of YT.Player constructor we touch. */
export type YouTubePlayerCtor = new (
  el: HTMLElement,
  options: {
    videoId?: string;
    width?: string | number;
    height?: string | number;
    playerVars?: Record<string, unknown>;
    events?: {
      onReady?: (event: { target: YouTubePlayerInstance }) => void;
      onStateChange?: (event: { data: number; target: YouTubePlayerInstance }) => void;
      onError?: (event: { data: number; target: YouTubePlayerInstance }) => void;
    };
  },
) => YouTubePlayerInstance;

export interface YouTubeRuntime {
  Player: YouTubePlayerCtor;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number };
}

export interface YouTubeProviderOptions {
  /** Override the runtime loader. Default: inject the YT IFrame API `<script>`. */
  loadRuntime?: () => Promise<YouTubeRuntime>;
  /** Surface state changes to the core. */
  onStateChange?: (state: "playing" | "paused" | "ended" | "buffering" | "ready") => void;
  /** Surface load errors to the core. */
  onError?: (error: { message: string; cause?: unknown }) => void;
  /**
   * Bridge YouTube's polled `getCurrentTime()` value back into the core
   * store / event bus. Without this callback, seek bars and time-aware
   * plugins (markers, resume-position, analytics) would never tick on
   * YouTube sources (A3 in the 2026-05-12 review).
   */
  onTimeUpdate?: (currentTime: number) => void;
  /**
   * Bridge YouTube's `getDuration()` once the player is ready. Fires once
   * per attach.
   */
  onDuration?: (duration: number) => void;
  /**
   * Polling interval for the time bridge in milliseconds. Defaults to 250.
   */
  timeBridgeIntervalMs?: number;
}

const YT_SCRIPT_SRC = "https://www.youtube.com/iframe_api";

/* c8 ignore start — only exercised in real browsers; tests inject `loadRuntime`. */
const defaultLoad = (): Promise<YouTubeRuntime> => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube source provider requires a browser environment"));
  }
  type YT = { Player: YouTubePlayerCtor; PlayerState: YouTubeRuntime["PlayerState"] };
  type Win = Window & {
    YT?: YT;
    onYouTubeIframeAPIReady?: () => void;
  };
  const w = window as Win;
  if (w.YT && typeof w.YT.Player === "function") return Promise.resolve(w.YT);
  return new Promise<YouTubeRuntime>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${YT_SCRIPT_SRC}"]`);
    const onReady = (): void => {
      if (w.YT && typeof w.YT.Player === "function") resolve(w.YT);
      else reject(new Error("YouTube IFrame API loaded without YT.Player"));
    };
    const previousReady = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      onReady();
    };
    if (!existing) {
      const script = document.createElement("script");
      script.src = YT_SCRIPT_SRC;
      script.async = true;
      script.onerror = () => reject(new Error("Failed to load YouTube IFrame API"));
      document.head.appendChild(script);
    }
  });
};
/* c8 ignore stop */

/** Extract the `videoId` from any YouTube URL form. */
export function extractYouTubeId(url: string): string | null {
  const m =
    url.match(/[?&]v=([^&]+)/) ??
    url.match(/youtu\.be\/([^?&/]+)/) ??
    url.match(/youtube\.com\/embed\/([^?&/]+)/) ??
    url.match(/youtube\.com\/shorts\/([^?&/]+)/);
  return m?.[1] ?? null;
}

/**
 * Marker attribute applied to the underlying `<video>` element while the
 * YouTube iframe owns playback. CSS theme contracts hide the native element
 * via `[data-f8-player-yt-hidden] { visibility: hidden; }` (B6 — replaces
 * the inline-style mutation that fought host CSS).
 */
const YT_HIDDEN_ATTR = "data-f8-player-yt-hidden";

let staticParentWarned = false;

class YouTubeLoader implements SourceLoader {
  private yt: YouTubePlayerInstance | null = null;
  private video: HTMLVideoElement | null = null;
  private host: HTMLElement | null = null;
  private timeIntervalId: ReturnType<typeof setInterval> | null = null;
  private duration = 0;
  private rejectAttach: ((err: Error) => void) | null = null;
  private aborted = false;

  constructor(private readonly options: YouTubeProviderOptions) {}

  async attach(video: HTMLVideoElement, source: SourceDescriptor): Promise<void> {
    this.detach();
    this.aborted = false;
    const id = extractYouTubeId(source.src);
    if (!id) {
      throw new Error(`Cannot extract YouTube videoId from "${source.src}"`);
    }
    this.video = video;

    const YT = await (this.options.loadRuntime ?? defaultLoad)();
    if (this.aborted) {
      throw makeYtAbortError();
    }

    const parent = video.parentElement;
    if (!parent) {
      throw new Error("YouTube source provider requires <video> to be attached to the DOM");
    }

    // The YouTube iframe relies on `position: absolute; inset: 0` on the
    // host, which only works when an ancestor is a positioned offsetParent.
    // Warn (once per page) so consumers know to set `position: relative` on
    // the player container (B6 part 2).
    /* c8 ignore start — getComputedStyle is a no-op in jsdom for parents that aren't styled */
    if (typeof window !== "undefined" && !staticParentWarned) {
      try {
        const computed = window.getComputedStyle(parent).position;
        if (computed === "static") {
          staticParentWarned = true;
          console.warn(
            "[@f8/player-core] YouTube source: <video>'s parent has `position: static`. " +
              "Set the player container to `position: relative` (or absolute/fixed) so " +
              "the YouTube iframe can fill the stage.",
          );
        }
      } catch {
        // ignore — happens in non-browser test environments
      }
    }
    /* c8 ignore stop */

    const host = document.createElement("div");
    host.setAttribute("data-f8-player-yt-host", "");
    // The host must fill the stage absolutely so the YT iframe stretches to 100%.
    host.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;overflow:hidden;background:#000;";
    parent.appendChild(host);
    this.host = host;

    // Hide the underlying <video> via a data attribute instead of inline
    // style — host CSS owns the actual `visibility` rule. This avoids
    // fighting the host's CSS transitions / dark-mode overrides (B6).
    video.setAttribute(YT_HIDDEN_ATTR, "");

    return new Promise<void>((resolve, reject) => {
      this.rejectAttach = reject;
      let settled = false;
      const settle = (run: () => void): void => {
        if (settled) return;
        settled = true;
        run();
      };

      try {
        this.yt = new YT.Player(host, {
          videoId: id,
          // 100% so the iframe fills the host div rather than using default px dimensions.
          width: "100%",
          height: "100%",
          playerVars: {
            playsinline: 1,
            modestbranding: 1,
            rel: 0,
            // enablejsapi is implicitly set by the IFrame API; explicit = good practice.
            enablejsapi: 1,
          },
          events: {
            onReady: () => {
              // Force the generated <iframe> to fill its parent regardless of
              // what YT.Player chose as its initial dimensions.
              const iframe = host.querySelector("iframe");
              if (iframe) {
                iframe.style.cssText = "width:100%;height:100%;border:none;display:block;";
              }
              try {
                this.duration = this.yt?.getDuration() ?? 0;
                if (this.duration > 0) {
                  this.options.onDuration?.(this.duration);
                }
              } catch {
                // ignore
              }
              this.startTimeBridge();
              this.options.onStateChange?.("ready");
              settle(() => resolve());
            },
            onStateChange: ({ data }) => {
              switch (data) {
                case YT.PlayerState.PLAYING:
                  this.options.onStateChange?.("playing");
                  break;
                case YT.PlayerState.PAUSED:
                  this.options.onStateChange?.("paused");
                  break;
                case YT.PlayerState.ENDED:
                  this.options.onStateChange?.("ended");
                  break;
                case YT.PlayerState.BUFFERING:
                  this.options.onStateChange?.("buffering");
                  break;
                default:
                  break;
              }
            },
            onError: ({ data }) => {
              const err = { message: `YouTube error code=${data}`, cause: { code: data } };
              this.options.onError?.(err);
              settle(() => reject(new Error(err.message)));
            },
          },
        });
      } catch (err) {
        settle(() => reject(err instanceof Error ? err : new Error(String(err))));
      }
    });
  }

  abort(): void {
    if (this.aborted) return;
    this.aborted = true;
    const reject = this.rejectAttach;
    this.rejectAttach = null;
    reject?.(makeYtAbortError());
  }

  detach(): void {
    this.abort();
    if (this.timeIntervalId !== null) {
      clearInterval(this.timeIntervalId);
      this.timeIntervalId = null;
    }
    if (this.yt) {
      try {
        this.yt.destroy();
      } catch {
        // ignore
      }
      this.yt = null;
    }
    if (this.host && this.host.parentElement) {
      try {
        this.host.parentElement.removeChild(this.host);
      } catch {
        // ignore
      }
    }
    this.host = null;
    if (this.video) {
      this.video.removeAttribute(YT_HIDDEN_ATTR);
      this.video = null;
    }
    this.duration = 0;
    this.aborted = false;
  }

  private startTimeBridge(): void {
    if (this.timeIntervalId !== null) return;
    const interval = this.options.timeBridgeIntervalMs ?? 250;
    this.timeIntervalId = setInterval(() => {
      if (!this.yt) return;
      try {
        const currentTime = this.yt.getCurrentTime();
        this.options.onTimeUpdate?.(currentTime);
        // Cache duration in case it became known after onReady (rare but
        // possible for live YouTube streams).
        const duration = this.yt.getDuration();
        if (duration > 0 && duration !== this.duration) {
          this.duration = duration;
          this.options.onDuration?.(duration);
        }
      } catch {
        // ignore
      }
    }, interval);
  }

  /** @internal */
  _instance(): YouTubePlayerInstance | null {
    return this.yt;
  }
}

function makeYtAbortError(): Error {
  const err = new Error("YouTube loader aborted");
  err.name = "AbortError";
  return err;
}

/**
 * Build the YouTube source provider with bound core callbacks.
 */
export function createYouTubeProvider(options: YouTubeProviderOptions = {}): SourceProvider {
  return {
    name: "youtube",
    canHandle: (source) => {
      if (source.type === "youtube") return true;
      const type = detectSourceType(source);
      return type === "youtube" || (type === "auto" && looksLikeYouTube(source.src));
    },
    createLoader: () => new YouTubeLoader(options),
  };
}
