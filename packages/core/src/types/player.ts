import { type PlayerEvents } from "./events.js";
import { type CommandRegistry, type PluginInstance } from "./plugin.js";
import { type SourceDescriptor } from "./source.js";
import { type BufferedRange, type PlayerState } from "./state.js";

/**
 * Disposer returned by every subscription / listener helper. Idempotent.
 */
export type Disposer = () => void;

/**
 * Public Player surface. Returned by `createPlayer(options)`.
 *
 * Lifecycle: `createPlayer` → `attach(<video>)` → use → `detach` (optional)
 * → `dispose`. After `dispose`, every subsequent call is a no-op (or throws,
 * for clearly invalid use).
 *
 * Golden cases:
 * - G12: `play / pause / paused / seekTo` shape-conform with `VideoPlayerHandle`.
 * - G7: `setPlaybackRate`, `setVolume`, `setMuted`.
 * - G8: `seekTo` accepts seconds; the React adapter additionally accepts `"00:01:23"`.
 */
export interface Player {
  /* ---------------------------------------------------------------------- */
  /* Source                                                                 */
  /* ---------------------------------------------------------------------- */

  /** Replace (or clear) the active source. */
  setSource(source: SourceDescriptor | null): void;
  /** Snapshot of the active source. */
  getSource(): SourceDescriptor | null;
  /**
   * Re-attempt loading the current source. No-op if no source is set.
   *
   * Internally equivalent to `setSource(getSource())`: the state machine
   * detaches the failed loader, clears the error, and starts a fresh
   * `loading → ready` cycle. Use this from a "Try again" button on an
   * error overlay.
   *
   * @returns `true` when retry was dispatched, `false` when there was
   *  nothing to retry.
   */
  retry(): boolean;

  /* ---------------------------------------------------------------------- */
  /* Playback                                                               */
  /* ---------------------------------------------------------------------- */

  /** Start playback. May reject (autoplay policy, no source, dispose). */
  play(): Promise<void>;
  /** Pause playback. */
  pause(): void;
  /** Whether the player is paused. */
  paused(): boolean;
  /** Seek to a time in seconds. Clamped to `[0, duration]`. */
  seekTo(seconds: number): void;
  /** Set playback rate. */
  setPlaybackRate(rate: number): void;
  /** Set volume on `[0, 1]`. */
  setVolume(volume: number): void;
  /** Set muted state. */
  setMuted(muted: boolean): void;

  /* ---------------------------------------------------------------------- */
  /* State (snapshot reads)                                                 */
  /* ---------------------------------------------------------------------- */

  /** Snapshot read of the full state. */
  getState(): PlayerState;
  /** Current playback position in seconds. */
  getCurrentTime(): number;
  /** Current duration in seconds. */
  getDuration(): number;
  /** Buffered ranges. */
  getBuffered(): BufferedRange[];

  /* ---------------------------------------------------------------------- */
  /* Reactive                                                               */
  /* ---------------------------------------------------------------------- */

  /**
   * Subscribe to a built-in event. Returns a disposer.
   *
   * Plugin events (`subtitles:change`, etc.) ride the same bus but lose
   * type-safety because they are loaded dynamically. Plugins augment via
   * declaration-merging if they need typed events.
   */
  on<K extends keyof PlayerEvents>(event: K, handler: (payload: PlayerEvents[K]) => void): Disposer;
  /** Remove an event handler. */
  off<K extends keyof PlayerEvents>(event: K, handler: (payload: PlayerEvents[K]) => void): void;
  /** Subscribe to a slice of state. The listener fires only when the slice changes (===). */
  subscribe<T>(selector: (state: PlayerState) => T, listener: (value: T) => void): Disposer;

  /* ---------------------------------------------------------------------- */
  /* Plugins / commands                                                     */
  /* ---------------------------------------------------------------------- */

  /** Register a plugin after construction. */
  use(plugin: PluginInstance): void;
  /** Remove a plugin by name. Calls its teardown. */
  removePlugin(name: string): void;
  /** Shared command registry. */
  commands: CommandRegistry;

  /* ---------------------------------------------------------------------- */
  /* Lifecycle                                                              */
  /* ---------------------------------------------------------------------- */

  /** Attach to a `<video>` element. Resolves once `loadedmetadata` fires. */
  attach(el: HTMLVideoElement): Promise<void>;
  /** Detach from the current `<video>` without disposing the player. */
  detach(): void;
  /** Dispose every resource. After this, the player is dead. */
  dispose(): void;
}
