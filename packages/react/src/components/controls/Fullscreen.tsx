import { type ComponentPropsWithoutRef } from "react";

import { usePlayer } from "../../hooks/usePlayer.js";
import { usePlayerState } from "../../hooks/usePlayerState.js";

export type FullscreenProps = Omit<ComponentPropsWithoutRef<"button">, "onClick" | "aria-pressed">;

/**
 * `<Player.Controls.Fullscreen>` — toggles fullscreen on the player container.
 *
 * ARIA: `aria-label` / `aria-pressed` reflect fullscreen state.
 */
export function Fullscreen({ children, ...rest }: FullscreenProps): JSX.Element {
  const player = usePlayer();
  const fullscreen = usePlayerState((s) => s.fullscreen);
  const label = fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình";

  const handleClick = (): void => {
    player.commands.run("fullscreen:toggle");
  };

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={fullscreen}
      onClick={handleClick}
      data-f8-player-control="fullscreen"
      {...rest}
    >
      {children ?? (fullscreen ? "⛶" : "⛶")}
    </button>
  );
}
