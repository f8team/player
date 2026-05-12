import { type ComponentPropsWithoutRef, type KeyboardEvent, type MouseEvent } from "react";

import { usePlayer } from "../../hooks/usePlayer.js";
import { usePlayerState } from "../../hooks/usePlayerState.js";
import { useSourceType } from "../../hooks/useSourceType.js";
import { useLabels } from "../../i18n.js";

import { PlayerIcon } from "./icons.js";

export type CenterPlayOverlayProps = ComponentPropsWithoutRef<"div">;

/**
 * Full-stage tap target (YouTube-style): click / tap the video surface toggles
 * play/pause. When paused, a large centered play icon is shown.
 *
 * Omit when the active source is YouTube (native embed controls). Consumers
 * should also skip when a poster / “light” overlay already covers first play.
 */
export function CenterPlayOverlay({ className, style, ...rest }: CenterPlayOverlayProps): JSX.Element | null {
  const player = usePlayer();
  const labels = useLabels();
  const sourceType = useSourceType();
  const status = usePlayerState((s) => s.status);
  const isPlaying = status === "playing";

  if (sourceType === "youtube") {
    return null;
  }

  const label = isPlaying ? labels.pause : labels.play;

  const toggle = (): void => {
    if (isPlaying) {
      player.pause();
      return;
    }
    void player.play().catch(() => {
      /* surfaced via error event */
    });
  };

  const onClick = (e: MouseEvent<HTMLDivElement>): void => {
    e.stopPropagation();
    toggle();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    toggle();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      data-f8-player-center-tap=""
      className={className}
      style={style}
      onClick={onClick}
      onKeyDown={onKeyDown}
      {...rest}
    >
      {!isPlaying ? (
        <span data-f8-player-big-play="">
          <PlayerIcon name="play" />
        </span>
      ) : null}
    </div>
  );
}
