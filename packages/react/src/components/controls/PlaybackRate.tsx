import { type ChangeEvent } from "react";

import { usePlayer } from "../../hooks/usePlayer.js";
import { usePlayerState } from "../../hooks/usePlayerState.js";

export interface PlaybackRateProps {
  rates?: number[];
  className?: string;
}

const DEFAULT_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/**
 * `<Player.Controls.PlaybackRate>` — a `<select>` for choosing the playback
 * speed.
 *
 * ARIA: `aria-label="Tốc độ phát"`.
 *
 * Golden case: G7 (playback rate in course video lesson editor).
 */
export function PlaybackRate({
  rates = DEFAULT_RATES,
  className,
}: PlaybackRateProps): JSX.Element {
  const player = usePlayer();
  const playbackRate = usePlayerState((s) => s.playbackRate);

  const handleChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    player.setPlaybackRate(Number(e.target.value));
  };

  return (
    <select
      className={className}
      value={playbackRate}
      onChange={handleChange}
      aria-label="Tốc độ phát"
      data-f8-player-control="playback-rate"
    >
      {rates.map((r) => (
        <option key={r} value={r}>
          {r === 1 ? "Bình thường" : `${r}×`}
        </option>
      ))}
    </select>
  );
}
