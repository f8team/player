import type { Player, PlayerOptions } from "@f8/player-core";
import { forwardRef, useImperativeHandle, useRef } from "react";
import type React from "react";


import { usePlayer } from "../hooks/usePlayer.js";

import { Captions } from "./Captions.js";
import { Bar } from "./controls/Bar.js";
import { Fullscreen } from "./controls/Fullscreen.js";
import { Mute } from "./controls/Mute.js";
import { PlaybackRate } from "./controls/PlaybackRate.js";
import { PlayPause } from "./controls/PlayPause.js";
import { Quality } from "./controls/Quality.js";
import { SeekBar } from "./controls/SeekBar.js";
import { Time } from "./controls/Time.js";
import { Volume } from "./controls/Volume.js";
import { Root } from "./Root.js";
import { Video } from "./Video.js";

// ---------------------------------------------------------------------------
// PlayerHandle
// ---------------------------------------------------------------------------

/**
 * Imperative handle exposed via `forwardRef`. Shape-compatible with the legacy
 * F8 `VideoPlayerHandle`.
 *
 * Golden case: G12 (courses + story iframes rely on `play/pause/paused/seekTo`
 * being callable externally).
 */
export interface PlayerHandle {
  /** Start playback. */
  play(): Promise<void>;
  /** Pause playback. */
  pause(): void;
  /** Whether the player is currently paused. */
  paused(): boolean;
  /** Seek to `seconds`. */
  seekTo(seconds: number): void;
  /**
   * Resume the last paused position. Alias of `play()` — exists for back-
   * compat with the legacy `VideoPlayerHandle.restore` API.
   */
  restore(): Promise<void>;
  /** Access the underlying core player for advanced use. */
  raw: Player;
}

// ---------------------------------------------------------------------------
// Inner handle wiring (rendered inside Root so it can call usePlayer)
// ---------------------------------------------------------------------------

interface InnerHandleProps {
  handleRef: React.Ref<PlayerHandle>;
}

function InnerHandle({ handleRef }: InnerHandleProps): null {
  const player = usePlayer();
  const lastPausedTime = useRef<number>(0);

  useImperativeHandle(
    handleRef,
    () => ({
      play: () => player.play(),
      pause: () => {
        lastPausedTime.current = player.getCurrentTime();
        player.pause();
      },
      paused: () => player.paused(),
      seekTo: (s) => player.seekTo(s),
      restore: async () => {
        if (lastPausedTime.current > 0) {
          player.seekTo(lastPausedTime.current);
        }
        return player.play();
      },
      raw: player,
    }),
    [player],
  );

  return null;
}

// ---------------------------------------------------------------------------
// One-liner <Player>
// ---------------------------------------------------------------------------

export interface PlayerComponentProps {
  /** Player engine options. */
  options?: PlayerOptions;
  /** Whether to render the built-in controls bar. Defaults to `true`. */
  controls?: boolean;
  /** Custom class for the outer container `<div>`. */
  containerClassName?: string;
  /** Class forwarded to the inner `<video>`. */
  className?: string;
  /** Style forwarded to the inner `<video>`. */
  style?: React.CSSProperties;
  /** Children rendered inside the outer container (slots, overlays, etc.). */
  children?: React.ReactNode;
}

/**
 * `<Player>` — one-liner that composes `<Player.Root>`, `<Player.Video>`,
 * `<Player.Captions>`, and a `<Player.Controls.Bar>` with all built-in atoms.
 *
 * Pass `controls={false}` for a bare video (story/hero use-cases). Use the
 * composable primitives (`<Player.Root>`, `<Player.Video>`, etc.) for full
 * customisation.
 *
 * Ref: forwards a {@link PlayerHandle} for imperative use.
 *
 * @example
 * const ref = useRef<PlayerHandle>(null);
 * <Player
 *   options={{ source: { src: "https://cdn.example.com/video.m3u8" } }}
 *   ref={ref}
 * />
 * // later:
 * ref.current?.play();
 */
export const PlayerComponent = forwardRef<PlayerHandle, PlayerComponentProps>(
  function PlayerComponent(
    { options, controls = true, containerClassName, className, style, children },
    ref,
  ) {
    return (
      <Root options={options}>
        <InnerHandle handleRef={ref} />
        <div
          className={containerClassName}
          style={{ position: "relative" }}
          data-f8-player=""
        >
          <Video className={className} style={style} />
          <Captions />
          {controls && (
            <Bar>
              <PlayPause />
              <SeekBar />
              <Time variant="current" />
              <Time variant="duration" />
              <Volume />
              <Mute />
              <PlaybackRate />
              <Quality />
              <Fullscreen />
            </Bar>
          )}
          {children}
        </div>
      </Root>
    );
  },
);
