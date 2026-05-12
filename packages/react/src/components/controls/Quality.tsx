import type { QualityLevel } from "@f8/player-core";
import { type ChangeEvent } from "react";

import { usePlayer } from "../../hooks/usePlayer.js";
import { usePlayerState } from "../../hooks/usePlayerState.js";
import { useLabels } from "../../i18n.js";

export interface QualityProps {
  className?: string;
}

function formatQualityLabel(label: string): string {
  const match = label.match(/^(\d+)p$/i);
  return match ? `${match[1]} HD` : label;
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
export function Quality({ className }: QualityProps): JSX.Element | null {
  const player = usePlayer();
  const labels = useLabels();
  const qualities = usePlayerState((s) => s.qualities);
  const activeQuality = usePlayerState((s) => s.activeQuality);

  if (qualities.length === 0) return null;

  const handleChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const val = e.target.value;
    if (val === "auto") {
      player.commands.run("hls-quality:setAuto");
    } else {
      const q = qualities.find((level) => level.id === val);
      if (q) {
        player.commands.run("hls-quality:set", q as unknown as Record<string, unknown>);
      }
    }
  };

  return (
    <select
      className={className}
      value={activeQuality?.id ?? "auto"}
      onChange={handleChange}
      aria-label={labels.quality}
      data-f8-player-control="quality"
    >
      <option value="auto">{labels.qualityAuto}</option>
      {qualities.map((q: QualityLevel) => (
        <option key={q.id} value={q.id}>
          {formatQualityLabel(q.label)}
        </option>
      ))}
    </select>
  );
}
