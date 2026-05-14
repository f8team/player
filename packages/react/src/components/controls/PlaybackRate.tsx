import { usePlayer } from "../../hooks/usePlayer.js";
import { usePlayerState } from "../../hooks/usePlayerState.js";
import { useLabels } from "../../i18n.js";

import { ControlMenu, type ControlMenuOption } from "./ControlMenu.js";

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

  const options: ControlMenuOption[] = rates.map((r) => ({
    value: String(r),
    label: r === 1 ? (normalLabel ?? "1×") : `${r}×`,
    active: r === playbackRate,
    onSelect: () => player.setPlaybackRate(r),
  }));

  return (
    <ControlMenu
      className={className}
      control="playback-rate"
      menuId="speed"
      ariaLabel={labels.playbackRate}
      active={playbackRate !== 1}
      trigger={
        <span data-reel-trigger-label="">{playbackRate === 1 ? "1×" : `${playbackRate}×`}</span>
      }
      options={options}
    />
  );
}
