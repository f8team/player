import { type ComponentPropsWithoutRef } from "react";

import { usePlayer } from "../../hooks/usePlayer.js";
import { usePlayerState } from "../../hooks/usePlayerState.js";
import { useLabels } from "../../i18n.js";

export type PipProps = Omit<ComponentPropsWithoutRef<"button">, "onClick" | "aria-pressed">;

/**
 * `<Player.Controls.Pip>` — toggles Picture-in-Picture.
 *
 * ARIA: `aria-label` reads `labels.pipEnter` / `labels.pipExit`.
 * Hidden automatically if `document.pictureInPictureEnabled` is false.
 */
export function Pip({ children, ...rest }: PipProps): JSX.Element | null {
  const player = usePlayer();
  const labels = useLabels();
  const pip = usePlayerState((s) => s.pip);

  if (typeof document !== "undefined" && !document.pictureInPictureEnabled) {
    return null;
  }

  const label = pip ? labels.pipExit : labels.pipEnter;

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
