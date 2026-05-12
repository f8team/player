import { type ChangeEvent } from "react";

import { usePlayer } from "../../hooks/usePlayer.js";
import { usePlayerState } from "../../hooks/usePlayerState.js";
import { useLabels } from "../../i18n.js";

export interface PlaybackRateProps {
  rates?: number[];
  className?: string;
  /**
   * Optional label for the "normal speed" (1×) option. Defaults to the
   * locale's word for `Normal` from the active `PlayerLabels` context if
   * not set — currently uses the rate string `1×` to stay simple.
   */
  normalLabel?: string;
}

const DEFAULT_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/**
 * `<Player.Controls.PlaybackRate>` — a `<select>` for choosing the playback
 * speed.
 *
 * ARIA: `aria-label` reads `labels.playbackRate`.
 *
 * Golden case: G7 (playback rate in course video lesson editor).
 */
export function PlaybackRate({
  rates = DEFAULT_RATES,
  className,
  normalLabel,
}: PlaybackRateProps): JSX.Element {
  const player = usePlayer();
  const labels = useLabels();
  const playbackRate = usePlayerState((s) => s.playbackRate);

  const handleChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    player.setPlaybackRate(Number(e.target.value));
  };

  return (
    <select
      className={className}
      value={playbackRate}
      onChange={handleChange}
      aria-label={labels.playbackRate}
      data-f8-player-control="playback-rate"
    >
      {rates.map((r) => (
        <option key={r} value={r}>
          {r === 1 ? (normalLabel ?? "1×") : `${r}×`}
        </option>
      ))}
    </select>
  );
}
