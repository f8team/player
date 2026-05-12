import { type ChangeEvent } from "react";

import { usePlayer } from "../../hooks/usePlayer.js";
import { usePlayerState } from "../../hooks/usePlayerState.js";
import { useLabels } from "../../i18n.js";

import { PlayerIcon } from "./icons.js";

export interface SettingsProps {
  rates?: number[];
  className?: string;
  normalLabel?: string;
}

const DEFAULT_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/**
 * `<Player.Controls.Settings>` — compact gear control backed by a native
 * playback-rate select so pointer, keyboard, and mobile pickers keep working.
 */
export function Settings({
  rates = DEFAULT_RATES,
  className,
  normalLabel,
}: SettingsProps): JSX.Element {
  const player = usePlayer();
  const labels = useLabels();
  const playbackRate = usePlayerState((s) => s.playbackRate);

  const handleChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    player.setPlaybackRate(Number(e.target.value));
  };

  return (
    <span
      className={className}
      title={labels.settings}
      data-f8-player-control="settings"
      data-playback-rate={playbackRate}
    >
      <PlayerIcon name="settings" />
      <select
        value={playbackRate}
        onChange={handleChange}
        aria-label={labels.settings}
        data-f8-player-settings-select=""
      >
        {rates.map((rate) => (
          <option key={rate} value={rate}>
            {rate === 1 ? (normalLabel ?? "1×") : `${rate}×`}
          </option>
        ))}
      </select>
    </span>
  );
}
