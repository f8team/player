import { formatTime } from "@f8/player-core";

import { usePlayerState } from "../../hooks/usePlayerState.js";

export interface TimeProps {
  /** Which value to display. Defaults to `"current"`. */
  variant?: "current" | "duration" | "remaining";
  className?: string;
}

/**
 * `<Player.Controls.Time>` — a `<time>` element displaying the current
 * position, total duration, or remaining time.
 */
export function Time({ variant = "current", className }: TimeProps): JSX.Element {
  const currentTime = usePlayerState((s) => s.currentTime);
  const duration = usePlayerState((s) => s.duration);

  let seconds: number;
  let label: string;

  switch (variant) {
    case "duration":
      seconds = duration;
      label = `Thời lượng: ${formatTime(seconds)}`;
      break;
    case "remaining":
      seconds = Math.max(0, duration - currentTime);
      label = `Còn lại: ${formatTime(seconds)}`;
      break;
    default:
      seconds = currentTime;
      label = `Vị trí hiện tại: ${formatTime(seconds)}`;
  }

  return (
    <time
      className={className}
      aria-label={label}
      dateTime={`PT${Math.round(seconds)}S`}
      data-f8-player-control="time"
      data-variant={variant}
    >
      {formatTime(seconds)}
    </time>
  );
}
