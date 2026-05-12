import { type ComponentPropsWithoutRef } from "react";

import { usePlayer } from "../../hooks/usePlayer.js";
import { usePlayerState } from "../../hooks/usePlayerState.js";
import { useLabels } from "../../i18n.js";

export type PlayPauseProps = Omit<ComponentPropsWithoutRef<"button">, "onClick" | "aria-pressed">;

/**
 * `<Player.Controls.PlayPause>` — toggles playback.
 *
 * ARIA: `aria-label` reads `labels.play` / `labels.pause` from the active
 * `PlayerLabels` context (English by default; pass `vietnameseLabels` for
 * Vietnamese). `aria-pressed` reflects whether the player is playing.
 */
export function PlayPause({ children, ...rest }: PlayPauseProps): JSX.Element {
  const player = usePlayer();
  const labels = useLabels();
  const isPlaying = usePlayerState((s) => s.status === "playing");
  const label = isPlaying ? labels.pause : labels.play;

  const handleClick = (): void => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play().catch(() => {
        /* surfaced via error event */
      });
    }
  };

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isPlaying}
      onClick={handleClick}
      data-f8-player-control="play-pause"
      {...rest}
    >
      {children ?? (isPlaying ? "⏸" : "▶")}
    </button>
  );
}
