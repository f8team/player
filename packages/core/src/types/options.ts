import { type PlayerError } from "./error.js";
import { type UnauthorizedEvent } from "./events.js";
import { type PluginInstance } from "./plugin.js";
import { type SourceDescriptor } from "./source.js";
import { type ThemeName, type ThemeTokens } from "./theme.js";

/**
 * Autoplay policy.
 *
 * - `off` (default) — never auto-play.
 * - `muted` — `play()` after `attach`, with `muted = true` (browser-friendly).
 * - `on` — attempt to play with the current `muted` state. May reject.
 */
export type AutoplayMode = "off" | "muted" | "on";

/**
 * Keyboard scope.
 *
 * - `global` — listen on `document.body` (default — G1, G3).
 * - `container` — listen on the player root only (G16 — embedded surfaces).
 * - `off` — no built-in handlers (G2 story owns its own keys).
 */
export type KeyboardScope = "global" | "container" | "off";

/**
 * Hooks called once per source / event. Hooks are sticky listeners — they
 * survive across renders / state updates because they live on the player
 * instance.
 */
export interface PlayerHooks {
  /**
   * Authenticated HLS / DASH XHR ended with 401 or 403 (G13). The legacy
   * F8 alias `onStreamUnauthorized` maps to this hook in `f8-ui`.
   */
  onUnauthorized?: (event: UnauthorizedEvent) => void;
  /** Any error (transport, decode, source). */
  onError?: (error: PlayerError) => void;
}

/**
 * Options accepted by `createPlayer(options)`.
 *
 * Every field is optional. The player attaches with no source until
 * `setSource` is called or `options.source` is provided.
 */
export interface PlayerOptions {
  /** Initial source. Omit to attach without playable media. */
  source?: SourceDescriptor;
  /** Autoplay policy. Defaults to `"off"`. */
  autoplay?: AutoplayMode;
  /** Seconds to seek to on first ready. */
  startTime?: number;
  /** Whether to loop on `ended`. */
  loop?: boolean;
  /** Initial muted state. Defaults to `false` (or `true` if autoplay is `muted`). */
  muted?: boolean;
  /** Initial volume on `[0, 1]`. */
  volume?: number;
  /** Initial playback rate. */
  playbackRate?: number;
  /** Poster URL — passed to `<video poster>`. */
  poster?: string;
  /** `<video preload>`. */
  preload?: "auto" | "metadata" | "none";
  /** iOS inline playback (G2, G14). Defaults to `true`. */
  playsInline?: boolean;
  /** `<video crossorigin>`. Defaults to `"anonymous"` when subtitle tracks exist (G15). */
  crossOrigin?: "anonymous" | "use-credentials" | null;
  /** Plugins to register synchronously at `createPlayer` time. */
  plugins?: PluginInstance[];
  /** Theme name or runtime token overrides. */
  theme?: ThemeName | ThemeTokens;
  /** Lifecycle hooks. */
  hooks?: PlayerHooks;
  /** Keyboard scoping. Adapters may override per-mount (G16). */
  keyboard?: { scope?: KeyboardScope };
}
