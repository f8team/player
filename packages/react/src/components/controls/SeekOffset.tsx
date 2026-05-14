import { type ComponentPropsWithoutRef } from "react";

import { usePlayer } from "../../hooks/usePlayer.js";
import { usePlayerState } from "../../hooks/usePlayerState.js";
import { useLabels } from "../../i18n.js";

import { PlayerIcon } from "./icons.js";

export type SeekOffsetProps = Omit<ComponentPropsWithoutRef<"button">, "onClick"> & {
  /** Positive values seek forward; negative values seek backward. */
  seconds: number;
};

function getSeekTarget(currentTime: number, duration: number, offset: number): number {
  const next = Math.max(0, currentTime + offset);

  if (!Number.isFinite(duration) || duration <= 0) {
    return next;
  }

  return Math.min(duration, next);
}

/**
 * `<Player.Controls.SeekOffset>` — seek forward/backward by a fixed number of
 * seconds while clamping safely at the beginning/end of finite media.
 */
export function SeekOffset({ children, seconds, ...rest }: SeekOffsetProps): JSX.Element {
  const player = usePlayer();
  const labels = useLabels();
  const currentTime = usePlayerState((s) => s.currentTime);
  const duration = usePlayerState((s) => s.duration);
  const isBackward = seconds < 0;
  const label = isBackward
    ? labels.seekBackward(Math.abs(seconds))
    : labels.seekForward(Math.abs(seconds));

  const handleClick = (): void => {
    player.seekTo(getSeekTarget(currentTime, duration, seconds));
  };

  return (
    <button
      type="button"
      aria-label={label}
      data-reel-control={isBackward ? "seek-backward" : "seek-forward"}
      data-seek-offset={seconds}
      onClick={handleClick}
      {...rest}
    >
      {children ?? <PlayerIcon name={isBackward ? "rewind" : "forward"} />}
    </button>
  );
}
