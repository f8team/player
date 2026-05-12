import { type ComponentPropsWithoutRef } from "react";

import { usePlayer } from "../../hooks/usePlayer.js";
import { usePlayerState } from "../../hooks/usePlayerState.js";
import { useLabels } from "../../i18n.js";

export type MuteProps = Omit<ComponentPropsWithoutRef<"button">, "onClick" | "aria-pressed">;

/**
 * `<Player.Controls.Mute>` — toggles muted state.
 *
 * ARIA: `aria-label` reads `labels.mute` / `labels.unmute` from the active
 * `PlayerLabels` context. `aria-pressed` reflects the current muted state.
 */
export function Mute({ children, ...rest }: MuteProps): JSX.Element {
  const player = usePlayer();
  const labels = useLabels();
  const muted = usePlayerState((s) => s.muted);
  const label = muted ? labels.unmute : labels.mute;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={muted}
      onClick={() => player.setMuted(!muted)}
      data-f8-player-control="mute"
      {...rest}
    >
      {children ?? (muted ? "🔇" : "🔊")}
    </button>
  );
}
