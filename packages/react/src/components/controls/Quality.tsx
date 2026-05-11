import type { QualityLevel } from "@f8/player-core";
import { type ChangeEvent } from "react";


import { usePlayer } from "../../hooks/usePlayer.js";
import { usePlayerState } from "../../hooks/usePlayerState.js";

export interface QualityProps {
  className?: string;
}

/**
 * `<Player.Controls.Quality>` — a `<select>` for choosing the HLS quality
 * level. Hidden when no quality levels are available (e.g. MP4 sources).
 *
 * ARIA: `aria-label="Chất lượng video"`.
 *
 * Golden case: G7 (quality selection in video lesson editor).
 */
export function Quality({ className }: QualityProps): JSX.Element | null {
  const player = usePlayer();
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
      aria-label="Chất lượng video"
      data-f8-player-control="quality"
    >
      <option value="auto">Tự động</option>
      {qualities.map((q: QualityLevel) => (
        <option key={q.id} value={q.id}>
          {q.label}
        </option>
      ))}
    </select>
  );
}
