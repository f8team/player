import { type ComponentPropsWithoutRef } from "react";

import { usePlayer } from "../../hooks/usePlayer.js";
import { usePlayerState } from "../../hooks/usePlayerState.js";

export type MuteProps = Omit<ComponentPropsWithoutRef<"button">, "onClick" | "aria-pressed">;

/**
 * `<Player.Controls.Mute>` — toggles muted state.
 *
 * ARIA: `aria-label` switches between "Tắt tiếng" / "Bật tiếng".
 * `aria-pressed` reflects the current muted state.
 */
export function Mute({ children, ...rest }: MuteProps): JSX.Element {
  const player = usePlayer();
  const muted = usePlayerState((s) => s.muted);
  const label = muted ? "Bật tiếng" : "Tắt tiếng";

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
