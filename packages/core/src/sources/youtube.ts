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

class YouTubeLoader implements SourceLoader {
  private yt: YouTubePlayerInstance | null = null;
  private video: HTMLVideoElement | null = null;
  private host: HTMLElement | null = null;
  private timeIntervalId: ReturnType<typeof setInterval> | null = null;
  private currentTime = 0;

  constructor(private readonly options: YouTubeProviderOptions) {}

  async attach(video: HTMLVideoElement, source: SourceDescriptor): Promise<void> {
    this.detach();
    const id = extractYouTubeId(source.src);
    if (!id) {
      throw new Error(`Cannot extract YouTube videoId from "${source.src}"`);
    }
    this.video = video;

    const YT = await (this.options.loadRuntime ?? defaultLoad)();

    const parent = video.parentElement;
    if (!parent) {
      throw new Error("YouTube source provider requires <video> to be attached to the DOM");
    }
    const host = document.createElement("div");
    host.setAttribute("data-f8-player-yt-host", "");
    // The host must fill the stage absolutely so the YT iframe stretches to 100%.
    host.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;overflow:hidden;background:#000;";
    parent.appendChild(host);
    this.host = host;

    // Hide the underlying <video> while YT owns playback.
    video.style.visibility = "hidden";

    return new Promise<void>((resolve, reject) => {
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
              this.startTimeBridge();
              this.options.onStateChange?.("ready");
              resolve();
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
              reject(new Error(err.message));
            },
          },
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  detach(): void {
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
      this.video.style.visibility = "";
      this.video = null;
    }
    this.currentTime = 0;
  }

  private startTimeBridge(): void {
    if (this.timeIntervalId !== null) return;
    this.timeIntervalId = setInterval(() => {
      if (!this.yt) return;
      try {
        this.currentTime = this.yt.getCurrentTime();
      } catch {
        // ignore
      }
    }, 250);
  }

  /** @internal */
  _instance(): YouTubePlayerInstance | null {
    return this.yt;
  }
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
