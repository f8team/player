/**
 * Media source descriptors and related contracts.
 *
 * Every adapter and plugin compiles against the public types declared here.
 * @see {@link ../../docs/spec/api-contract.md} for the frozen contract.
 */

/**
 * Subtitle / captions track attached to the underlying `<video>`.
 *
 * Maps to a `<track kind="subtitles">` child. Default-language priority is
 * implemented in the `subtitles` plugin (see G1, G15).
 *
 * Golden cases: G1 (course learning), G15 (VTT cross-origin).
 */
export interface SubtitleTrack {
  /** VTT URL. The BE must respond with `Access-Control-Allow-Origin: *` (G15). */
  src: string;
  /** BCP-47 language code (e.g. `"vi"`, `"en-US"`). */
  srcLang: string;
  /** Human-readable label (e.g. `"Tiếng Việt"`). */
  label: string;
  /** When `true`, this track wins the default-selection vote unconditionally. */
  default?: boolean;
}

/**
 * Sprite thumbnails (timeline hover preview) descriptor.
 *
 * The `src` URL must point to a WebVTT file whose cues map a time range to a
 * sprite tile, e.g.:
 *
 * ```
 * WEBVTT
 *
 * 00:00:00.000 --> 00:00:10.000
 * sprites/00001.jpg#xywh=0,0,160,90
 * ```
 *
 * Image URLs in the cue body may be absolute or relative; relative paths are
 * resolved against the VTT URL. The `@f8/player-plugin-thumbnails` plugin
 * fetches and parses the VTT, then exposes a `thumbnails:getAt(time)` command
 * consumed by the React/Lit `SeekBar` hover preview.
 */
export interface ThumbnailsDescriptor {
  /** Absolute VTT URL describing sprite cues. */
  src: string;
  /**
   * Send credentials when fetching the VTT (and resolved sprite images
   * when the browser permits). Defaults to `false`.
   */
  withCredentials?: boolean;
}

/**
 * The kind of source. `auto` lets the registry pick.
 *
 * - `hls` — HLS m3u8 manifest, dispatched to `hls.js` (or native on Safari).
 * - `mp4` — Progressive MP4/WebM, dispatched to the native engine.
 * - `youtube` — YouTube IFrame API.
 * - `dash` — MPEG-DASH (reserved for a future dash provider).
 * - `native` — Force the native engine even if the URL looks like HLS (G4 Safari escape).
 * - `auto` — Detect from the URL via `looksLikeHls` / `detectSourceType`.
 */
export type SourceType = "auto" | "hls" | "mp4" | "youtube" | "dash" | "native";

/**
 * Single playable source. The registry picks the right provider based on
 * `type` and the URL.
 *
 * Golden cases: G1, G2, G3, G4, G5, G7, G10, G11, G14.
 */
export interface SourceDescriptor {
  /** Absolute or relative URL. May be a `blob:`, `data:`, or `http(s):` URL. */
  src: string;
  /** Optional explicit type hint. Defaults to `"auto"`. */
  type?: SourceType;
  /**
   * Cookie / credentials policy for HLS XHRs.
   *
   * - `boolean` — sent for every request.
   * - `(url) => boolean` — predicate (e.g. allowlist `https://api-gateway*`, see G7, G13).
   */
  withCredentials?: boolean | ((url: string) => boolean);
  /** Subtitle tracks to attach (G1, G15). */
  tracks?: SubtitleTrack[];
  /**
   * Sprite-thumbnails VTT descriptor for timeline hover previews. When set,
   * the `@f8/player-plugin-thumbnails` plugin fetches and parses the VTT;
   * the `Controls.SeekBar` (React) and the Lit default chrome render a tile
   * tooltip during pointer hover.
   */
  thumbnails?: ThumbnailsDescriptor;
}

/**
 * One quality variant exposed by the engine (HLS levels, DASH representations).
 *
 * Golden case: G7 (course video lesson editor).
 */
export interface QualityLevel {
  /** Stable identifier produced by the loader (e.g. HLS level index). */
  id: string;
  /** Vertical resolution in pixels (e.g. `720`). */
  height: number;
  /** Average bitrate in bits per second. */
  bitrate: number;
  /** Display label (e.g. `"720p"`, `"Auto"`). */
  label: string;
}

/**
 * Imperative loader returned by a `SourceProvider`. The core attaches a single
 * loader at a time; switching sources detaches the previous loader before
 * attaching the new one.
 */
export interface SourceLoader {
  /** Attach the source to the underlying `<video>`. Resolves on `loadedmetadata`. */
  attach(video: HTMLVideoElement, source: SourceDescriptor): Promise<void>;
  /** Detach the source. Called before the next `attach` and on `dispose`. */
  detach(): void;
  /**
   * Optional: cancel any in-flight network work without tearing down the
   * already-attached media element. The core calls this on rapid
   * `setSource(A) → setSource(B)` transitions so the pending A loader can
   * stop firing callbacks before `detach()` executes.
   *
   * Implementations should:
   *   - Abort outstanding XHRs / `fetch` requests.
   *   - Reject the pending `attach()` Promise with an `AbortError`.
   *   - Remove any listeners whose only purpose is to resolve that Promise.
   *
   * `abort()` MUST be safe to call before `detach()`, after `detach()`, and
   * multiple times. Leave actual media-element / runtime cleanup to `detach()`.
   */
  abort?(): void;
  /** Optional: enumerate available quality levels (HLS, DASH). */
  getQualities?(): QualityLevel[];
  /** Optional: switch quality. `"auto"` re-enables ABR. */
  setQuality?(level: QualityLevel | "auto"): void;
}

/**
 * Provider that knows how to handle a class of sources (HLS, native, YouTube).
 */
export interface SourceProvider {
  /** Identifier used by `unregisterSource` and debug output. */
  name: string;
  /**
   * Decide whether this provider can handle the given source.
   *
   * - `true` — definite match.
   * - `"maybe"` — handle if no `true` match exists (used by the native fallback).
   * - `false` — skip.
   */
  canHandle(source: SourceDescriptor): boolean | "maybe";
  /** Construct a fresh loader. Called once per source attach. */
  createLoader(): SourceLoader;
}
