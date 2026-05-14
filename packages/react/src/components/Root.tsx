import { createPlayer } from "@f8team/reel-core";
import type { PlayerOptions, SourceDescriptor } from "@f8team/reel-core";
import { type ReactNode, useEffect, useMemo, useRef } from "react";

import { PlayerContext } from "../context/PlayerContext.js";
import { useCallbackProps, type PlayerCallbackProps } from "../hooks/useCallbackProps.js";
import { LabelsProvider, type PlayerLabels } from "../i18n.js";

// ─── Phase 2 reactive-prop surface (implemented) ─────────────────────────────
//
// Top-level reactive props parallel to `options`, so consumers no longer need
// hand-rolled bridge components (f8-ui SourceSync / EventBridge / HandleBridge,
// f8-dash-ui TimeupdateBridge). Frozen-options contract is preserved: `options`
// remains the once-on-mount seed; reactive props are diff'd in `useEffect` and
// forwarded to the imperative player setters when they change.
//
// Precedence: when a top-level prop AND `options.<field>` are both provided,
// the top-level prop wins. `options` is never re-read after mount.
// ─────────────────────────────────────────────────────────────────────────────

export interface RootProps extends PlayerCallbackProps {
  /**
   * `createPlayer` options. Passed once on mount; changes after mount are
   * ignored (same contract as `createPlayer` — use the reactive props below
   * or `player.setSource` etc. for runtime updates).
   */
  options?: PlayerOptions;
  /**
   * Reactive source. When changed (by `src` string equality + descriptor
   * identity), `player.setSource()` is called. Same value → no-op (avoids
   * HLS re-init on render). Wins over `options.source`.
   */
  source?: SourceDescriptor | null;
  /**
   * Reactive poster URL. Forwarded to `<video poster={...}>` via context;
   * does NOT trigger setSource. Wins over `options.poster`.
   */
  poster?: string;
  /** Reactive playback rate. On change → `player.setPlaybackRate(rate)`. */
  playbackRate?: number;
  /** Reactive volume (0–1). On change → `player.setVolume(volume)`. */
  volume?: number;
  /** Reactive muted flag. On change → `player.setMuted(muted)`. */
  muted?: boolean;
  /**
   * Override the user-visible labels for the built-in controls. Defaults
   * to English (`defaultLabels`). Pass `vietnameseLabels` from
   * `@f8team/reel-react` for the Vietnamese preset, or any partial override.
   */
  labels?: Partial<PlayerLabels>;
  children?: ReactNode;
  /** Optional ref-style callback to access the player instance imperatively. */
  playerRef?: ((player: ReturnType<typeof createPlayer>) => void) | null;
}

/**
 * `<Player.Root>` — creates and owns one `createPlayer` instance for its
 * subtree. Disposes on unmount.
 *
 * All hooks and primitives must be rendered inside this component.
 */
export function Root({
  options = {},
  source,
  poster,
  playbackRate,
  volume,
  muted,
  labels,
  children,
  playerRef,
  // PlayerCallbackProps are forwarded to the helper hook; keep the rest as
  // explicit destructure so TS catches new props that need wiring.
  onPlay,
  onPause,
  onEnded,
  onError,
  onReady,
  onProgress,
  onTimeUpdate,
  onDuration,
  onSeek,
  onSeeked,
  onStart,
  onUnauthorized,
  onQualityChange,
  onRateChange,
  onVolumeChange,
  onBuffering,
  onQualitySwitch,
}: RootProps): JSX.Element {
  // Options are read once on mount; subsequent changes are silently ignored.
  // Reactive-prop diffing below replaces the bridge-component pattern.
  const optionsRef = useRef(options);

  const player = useMemo(() => createPlayer(optionsRef.current), []);

  // Forward the player to the optional callback ref.
  const playerRefCurrent = playerRef;
  useEffect(() => {
    playerRefCurrent?.(player);
  }, [player, playerRefCurrent]);

  // Dispose on unmount.
  useEffect(() => () => player.dispose(), [player]);

  // ─── Reactive source ────────────────────────────────────────────────────
  // Diff by `src` string + descriptor identity. Skip when unchanged so HLS
  // engines do not tear down + rebuild on every render. The first effect
  // run is a no-op when `source` matches the seed in `options.source`.
  const lastSourceRef = useRef<SourceDescriptor | null | undefined>(undefined);
  useEffect(() => {
    if (source === undefined) return;
    const prev = lastSourceRef.current;
    // Identity match → no-op.
    if (prev === source) return;
    // String-equal src AND same descriptor reference fields → no-op too.
    if (prev && source && prev.src === source.src && prev.tracks === source.tracks) {
      lastSourceRef.current = source;
      return;
    }
    lastSourceRef.current = source;
    player.setSource(source);
  }, [player, source]);

  // ─── Reactive playback / audio ──────────────────────────────────────────
  useEffect(() => {
    if (playbackRate === undefined) return;
    player.setPlaybackRate(playbackRate);
  }, [player, playbackRate]);

  useEffect(() => {
    if (volume === undefined) return;
    player.setVolume(volume);
  }, [player, volume]);

  useEffect(() => {
    if (muted === undefined) return;
    player.setMuted(muted);
  }, [player, muted]);

  // ─── Callback props (replaces consumer EventBridge boilerplate) ─────────
  useCallbackProps(player, {
    onPlay,
    onPause,
    onEnded,
    onError,
    onReady,
    onProgress,
    onTimeUpdate,
    onDuration,
    onSeek,
    onSeeked,
    onStart,
    onUnauthorized,
    onQualityChange,
    onRateChange,
    onVolumeChange,
    onBuffering,
    onQualitySwitch,
  });

  // Context value. `poster` is reactive; `player` and `options` are stable.
  const ctx = useMemo(() => ({ player, options: optionsRef.current, poster }), [player, poster]);

  return (
    <PlayerContext.Provider value={ctx}>
      <LabelsProvider labels={labels}>{children}</LabelsProvider>
    </PlayerContext.Provider>
  );
}
