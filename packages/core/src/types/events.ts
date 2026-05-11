import { type PlayerError } from "./error.js";
import { type QualityLevel, type SourceDescriptor } from "./source.js";

/**
 * `unauthorized` event payload. Surfaced once per `source.src` for HLS XHRs
 * that end with HTTP 401 or 403 (G13).
 */
export interface UnauthorizedEvent {
  /** Failing URL (manifest or segment). */
  url: string;
  /** Always 401 or 403. */
  status: 401 | 403;
  /** The source that triggered the failure. */
  source: SourceDescriptor;
}

/**
 * Built-in player events. Plugin events use the `${string}:${string}` form
 * (e.g. `subtitles:change`, `markers:hover`); they pass through the bus
 * untyped because plugins are loaded dynamically.
 *
 * Golden cases:
 * - G1: `timeupdate` powers the 500 ms `onProgress` aggregation.
 * - G2: `play`, `pause`, `ended` drive story progress segments.
 * - G7: `qualitychange` fires when the lesson editor flips levels.
 * - G13: `unauthorized` triggers the auth callback.
 */
export interface PlayerEvents {
  /** Source loaded; metadata and duration are now valid. */
  ready: { duration: number };
  /** Playback started (or resumed). */
  play: void;
  /** Playback paused (user, programmatic, or background). */
  pause: void;
  /** Media ended. */
  ended: void;
  /**
   * Time progress. Fires on every native `timeupdate`; plugins can throttle.
   *
   * - `currentTime` — wall-clock playback position.
   * - `playedSeconds` — alias kept for parity with the legacy F8 player.
   * - `duration` — current duration (matches `state.duration`).
   */
  timeupdate: {
    currentTime: number;
    playedSeconds: number;
    duration: number;
  };
  /** Duration changed (live HLS, source switch). */
  durationchange: { duration: number };
  /** Playback rate changed (G7). */
  ratechange: { playbackRate: number };
  /** Volume or mute flipped. */
  volumechange: { volume: number; muted: boolean };
  /** Seek started (user or programmatic). */
  seeking: { time: number };
  /** Seek finished. */
  seeked: { time: number };
  /** Buffering toggled. `isBuffering=true` means stalled. */
  buffering: { isBuffering: boolean };
  /** Quality level changed. `auto=true` means ABR picked it. */
  qualitychange: { quality: QualityLevel | null; auto: boolean };
  /** Any error (transport, decode, source). */
  error: PlayerError;
  /** Authentication failure (G13). Fires at most once per source.src. */
  unauthorized: UnauthorizedEvent;
  /** Fullscreen toggled. */
  fullscreenchange: { fullscreen: boolean };
  /** Picture-in-Picture toggled. */
  pipchange: { pip: boolean };
}
