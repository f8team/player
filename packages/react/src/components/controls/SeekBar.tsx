import { type ChangeEvent, type ComponentPropsWithoutRef } from "react";

import { usePlayer } from "../../hooks/usePlayer.js";
import { usePlayerState } from "../../hooks/usePlayerState.js";

export type SeekBarProps = Omit<
  ComponentPropsWithoutRef<"input">,
  | "type"
  | "min"
  | "max"
  | "value"
  | "step"
  | "onChange"
  | "aria-valuenow"
  | "aria-valuemin"
  | "aria-valuemax"
>;

/**
 * `<Player.Controls.SeekBar>` — a range input that reflects and controls the
 * current playback position.
 *
 * ARIA: `role="slider"` with `aria-valuenow`, `aria-valuemin=0`,
 * `aria-valuemax` set to the current duration.
 *
 * Golden case: G8 (editor seek bar).
 */
export function SeekBar(props: SeekBarProps): JSX.Element {
  const player = usePlayer();
  const currentTime = usePlayerState((s) => s.currentTime);
  const duration = usePlayerState((s) => s.duration);

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    player.seekTo(Number(e.target.value));
  };

  const max = duration > 0 ? duration : 1;

  return (
    <input
      {...props}
      type="range"
      min={0}
      max={max}
      step={0.1}
      value={currentTime}
      onChange={handleChange}
      role="slider"
      aria-label="Vị trí phát"
      aria-valuenow={currentTime}
      aria-valuemin={0}
      aria-valuemax={max}
      data-f8-player-control="seek-bar"
    />
  );
}
