import { type PlayerError } from "./error.js";
import { type QualityLevel, type SourceDescriptor } from "./source.js";

/**
 * Lifecycle status of the player. The state machine guarantees these
 * transitions; see `docs/spec/architecture.md` for the transition diagram.
 */
export type PlayerStatus = "idle" | "loading" | "ready" | "playing" | "paused" | "ended" | "error";

/** Buffered range (start/end in seconds). */
export interface BufferedRange {
  start: number;
  end: number;
}

/**
 * Snapshot of the player's reactive state. Every adapter renders against
 * either the snapshot (`getState()`) or a memoized selector via `subscribe`.
 *
 * Golden cases: G7 (qualities, playback rate), G8 (currentTime/duration drives
 * seek bar), G13 (error.code === "unauthorized"), G14 (videoWidth/Height
 * confirm playback started inline on iOS).
 */
export interface PlayerState {
  /** Lifecycle status; never overlapping. */
  status: PlayerStatus;
  /** Active source. `null` until `setSource` is called. */
  source: SourceDescriptor | null;
  /** Current playback position in seconds. */
  currentTime: number;
  /** Media duration in seconds. `0` while loading; `Infinity` for live HLS. */
  duration: number;
  /** Buffered ranges in seconds. */
  buffered: BufferedRange[];
  /** Playback rate (`1` is normal speed). G7 lists [0.25..1.75]. */
  playbackRate: number;
  /** Volume on the `[0, 1]` scale. */
  volume: number;
  /** Whether the underlying `<video>` is muted. */
  muted: boolean;
  /** Native video width (after `loadedmetadata`). */
  videoWidth: number;
  /** Native video height (after `loadedmetadata`). */
  videoHeight: number;
  /** Whether Picture-in-Picture is currently active. */
  pip: boolean;
  /** Whether the document/element is in fullscreen. */
  fullscreen: boolean;
  /** Quality levels exposed by the loader (G7). Empty for native engines. */
  qualities: QualityLevel[];
  /** Active quality level. `null` while ABR is auto / loader does not expose levels. */
  activeQuality: QualityLevel | null;
  /** Latest error, if any. Cleared on `setSource` or successful retry. */
  error: PlayerError | null;
}
