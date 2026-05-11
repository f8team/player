import { type ChangeEvent, type ComponentPropsWithoutRef } from "react";

import { usePlayer } from "../../hooks/usePlayer.js";
import { usePlayerState } from "../../hooks/usePlayerState.js";

export type VolumeProps = Omit<
  ComponentPropsWithoutRef<"input">,
  "type" | "min" | "max" | "step" | "value" | "onChange"
>;

/**
 * `<Player.Controls.Volume>` — range slider controlling the volume on [0, 1].
 *
 * ARIA: `role="slider"` with `aria-valuenow`, `aria-label`.
 */
export function Volume(props: VolumeProps): JSX.Element {
  const player = usePlayer();
  const volume = usePlayerState((s) => s.volume);

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    player.setVolume(Number(e.target.value));
  };

  return (
    <input
      {...props}
      type="range"
      min={0}
      max={1}
      step={0.05}
      value={volume}
      onChange={handleChange}
      role="slider"
      aria-label="Âm lượng"
      aria-valuenow={volume}
      aria-valuemin={0}
      aria-valuemax={1}
      data-f8-player-control="volume"
    />
  );
}
