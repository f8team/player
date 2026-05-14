import { usePlayer } from "../../hooks/usePlayer.js";
import { usePlayerState } from "../../hooks/usePlayerState.js";
import { useLabels } from "../../i18n.js";

import { ControlMenu, type ControlMenuOption } from "./ControlMenu.js";
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

  const options: ControlMenuOption[] = rates.map((rate) => ({
    value: String(rate),
    label: rate === 1 ? (normalLabel ?? "1×") : `${rate}×`,
    active: rate === playbackRate,
    onSelect: () => player.setPlaybackRate(rate),
  }));

  return (
    <ControlMenu
      className={className}
      title={labels.settings}
      control="settings"
      menuId="speed"
      ariaLabel={labels.playbackRate}
      active={playbackRate !== 1}
      rootAttributes={{ "data-playback-rate": playbackRate }}
      trigger={
        <>
          <PlayerIcon name="settings" />
          <span data-reel-trigger-label="">{playbackRate === 1 ? "1×" : `${playbackRate}×`}</span>
        </>
      }
      options={options}
    />
  );
}
