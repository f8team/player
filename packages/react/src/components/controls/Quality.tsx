import type { QualityLevel } from "@f8team/reel-core";

import { usePlayer } from "../../hooks/usePlayer.js";
import { usePlayerState } from "../../hooks/usePlayerState.js";
import { useLabels } from "../../i18n.js";

import { ControlMenu, type ControlMenuOption } from "./ControlMenu.js";

export interface QualityProps {
  className?: string;
  /**
   * Text shown beside numeric heights like `720p`. Default `"HD"`.
   * Pass `null` to hide the badge entirely.
   */
  resolutionBadge?: string | null;
}

function getQualityParts(
  label: string,
  resolutionBadge: string | null | undefined,
): { text: string; badge: string | null; optionLabel: string } {
  const match = label.match(/^(\d+)p$/i);
  if (!match) return { text: label, badge: null, optionLabel: label };

  const text = `${match[1]}p`;
  const badge = resolutionBadge === null ? null : (resolutionBadge ?? "HD");
  const optionLabel = badge ? `${text} ${badge}` : text;
  return { text, badge, optionLabel };
}

/**
 * `<Player.Controls.Quality>` — a `<select>` for choosing the HLS quality
 * level. Hidden when no quality levels are available (e.g. MP4 sources).
 *
 * ARIA: `aria-label` reads `labels.quality`; the auto option label reads
 * `labels.qualityAuto`.
 *
 * Golden case: G7 (quality selection in video lesson editor).
 */
export function Quality({ className, resolutionBadge }: QualityProps): JSX.Element | null {
  const player = usePlayer();
  const labels = useLabels();
  const qualities = usePlayerState((s) => s.qualities);
  const activeQuality = usePlayerState((s) => s.activeQuality);

  if (qualities.length === 0) return null;

  const selectQuality = (value: string): void => {
    if (value === "auto") {
      player.commands.run("hls-quality:setAuto");
    } else {
      const q = qualities.find((level) => level.id === value);
      if (q) {
        player.commands.run("hls-quality:set", q as unknown as Record<string, unknown>);
      }
    }
  };

  const activeParts = activeQuality
    ? getQualityParts(activeQuality.label, resolutionBadge)
    : { text: labels.qualityAuto, badge: null };
  const options: ControlMenuOption[] = [
    {
      value: "auto",
      label: labels.qualityAuto,
      active: !activeQuality,
      onSelect: () => selectQuality("auto"),
    },
    ...qualities.map((q: QualityLevel) => {
      const parts = getQualityParts(q.label, resolutionBadge);
      return {
        value: q.id,
        label: parts.text,
        badge: parts.badge,
        active: activeQuality?.id === q.id,
        onSelect: () => selectQuality(q.id),
      };
    }),
  ];

  return (
    <ControlMenu
      className={className}
      control="quality"
      menuId="quality"
      ariaLabel={labels.quality}
      active={Boolean(activeQuality)}
      trigger={
        <span data-reel-quality-value="" aria-hidden="true">
          <span data-reel-quality-text="">{activeParts.text}</span>
          {activeParts.badge ? <span data-reel-quality-badge="">{activeParts.badge}</span> : null}
        </span>
      }
      options={options}
    />
  );
}
