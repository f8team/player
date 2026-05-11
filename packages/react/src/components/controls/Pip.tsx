import { type ComponentPropsWithoutRef } from "react";

import { usePlayer } from "../../hooks/usePlayer.js";
import { usePlayerState } from "../../hooks/usePlayerState.js";

export type PipProps = Omit<ComponentPropsWithoutRef<"button">, "onClick" | "aria-pressed">;

/**
 * `<Player.Controls.Pip>` — toggles Picture-in-Picture.
 *
 * ARIA: `aria-label` / `aria-pressed` reflect current PiP state.
 * Hidden automatically if `document.pictureInPictureEnabled` is false.
 */
export function Pip({ children, ...rest }: PipProps): JSX.Element | null {
  const player = usePlayer();
  const pip = usePlayerState((s) => s.pip);

  if (typeof document !== "undefined" && !document.pictureInPictureEnabled) {
    return null;
  }

  const label = pip ? "Thoát chế độ hình trong hình" : "Hình trong hình";

  const handleClick = (): void => {
    player.commands.run("pip:toggle");
  };

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pip}
      onClick={handleClick}
      data-f8-player-control="pip"
      {...rest}
    >
      {children ?? "⧉"}
    </button>
  );
}
