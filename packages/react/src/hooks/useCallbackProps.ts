import type { Player, PlayerError, QualityLevel, UnauthorizedEvent } from "@f8team/reel-core";
import { useEffect, useRef } from "react";

/**
 * Aggregate `onPlay/onPause/...` callback props supported by `<Root>` (Phase 2).
 *
 * Replaces the boilerplate `EventBridge` component each consumer (f8-ui,
 * f8-dash-ui) used to write. Each callback is kept stable via a ref, so
 * subscribers do NOT re-register when the prop identity changes — only the
 * ref's `.current` is updated.
 */
export interface PlayerCallbackProps {
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: PlayerError) => void;
  onReady?: (payload: { duration: number }) => void;
  onProgress?: (state: {
    played: number;
    playedSeconds: number;
    loaded: number;
    loadedSeconds: number;
  }) => void;
  onTimeUpdate?: (payload: {
    currentTime: number;
    playedSeconds: number;
    duration: number;
  }) => void;
  onDuration?: (duration: number) => void;
  onSeek?: (seconds: number) => void;
  onSeeked?: (seconds: number) => void;
  /** Fires once per mount on the first `play` event (matches react-player). */
  onStart?: () => void;
  onUnauthorized?: (event: UnauthorizedEvent) => void;
  onQualityChange?: (payload: { quality: QualityLevel | null; auto: boolean }) => void;
  onRateChange?: (playbackRate: number) => void;
  onVolumeChange?: (payload: { volume: number; muted: boolean }) => void;
  onBuffering?: (isBuffering: boolean) => void;
  onQualitySwitch?: (active: boolean) => void;
}

/**
 * Subscribe `<Root>` callback props to the corresponding player events.
 *
 * Stable-ref pattern: identity of each prop can change between renders without
 * triggering re-subscription. `onStart` is gated by a one-shot flag so it fires
 * exactly once on the first `play` (matches f8-ui `EventBridge` semantics).
 */
export function useCallbackProps(player: Player, props: PlayerCallbackProps): void {
  // Stable refs for every callback. Update on every render so the latest
  // function is invoked without recomputing subscribers.
  const ref = useRef(props);
  ref.current = props;

  // First-play guard for onStart, scoped to the player instance lifetime.
  const startedRef = useRef(false);

  useEffect(() => {
    startedRef.current = false;

    const disposers = [
      player.on("play", () => {
        ref.current.onPlay?.();
        if (!startedRef.current) {
          startedRef.current = true;
          ref.current.onStart?.();
        }
      }),
      player.on("pause", () => ref.current.onPause?.()),
      player.on("ended", () => ref.current.onEnded?.()),
      player.on("error", (err) => ref.current.onError?.(err)),
      player.on("ready", (payload) => {
        ref.current.onReady?.(payload);
        ref.current.onDuration?.(payload.duration);
      }),
      player.on("seeked", ({ time }) => {
        ref.current.onSeek?.(time);
        ref.current.onSeeked?.(time);
      }),
      player.on("timeupdate", (e) => {
        ref.current.onTimeUpdate?.(e);
        // react-player-compatible onProgress shape (G1, f8-ui EventBridge L296).
        const played = e.duration > 0 ? e.currentTime / e.duration : 0;
        ref.current.onProgress?.({
          played,
          playedSeconds: e.currentTime,
          loaded: 0,
          loadedSeconds: 0,
        });
      }),
      player.on("durationchange", ({ duration }) => ref.current.onDuration?.(duration)),
      player.on("ratechange", ({ playbackRate }) => ref.current.onRateChange?.(playbackRate)),
      player.on("volumechange", (e) => ref.current.onVolumeChange?.(e)),
      player.on("buffering", ({ isBuffering }) => ref.current.onBuffering?.(isBuffering)),
      player.on("qualitychange", (e) => ref.current.onQualityChange?.(e)),
      player.on("qualityswitch", ({ active }) => ref.current.onQualitySwitch?.(active)),
      player.on("unauthorized", (e) => ref.current.onUnauthorized?.(e)),
    ];

    return () => {
      for (const dispose of disposers) dispose();
    };
  }, [player]);
}
