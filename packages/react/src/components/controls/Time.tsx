import { formatTime } from "@f8/player-core";

import { usePlayerState } from "../../hooks/usePlayerState.js";
import { useLabels } from "../../i18n.js";

export interface TimeProps {
  /** Which value to display. Defaults to `"current"`. */
  variant?: "current" | "duration" | "remaining";
  className?: string;
}

/**
 * `<Player.Controls.Time>` — a `<time>` element displaying the current
 * position, total duration, or remaining time.
 *
 * ARIA: `aria-label` reads `labels.timeCurrent` / `labels.timeDuration` /
 * `labels.timeRemaining` — each function is called with the already-formatted
 * `MM:SS` (or `HH:MM:SS`) string so locales can frame it as they like.
 */
export function Time({ variant = "current", className }: TimeProps): JSX.Element {
  const labels = useLabels();
  const currentTime = usePlayerState((s) => s.currentTime);
  const duration = usePlayerState((s) => s.duration);

  let seconds: number;
  let formatted: string;
  let label: string;

  switch (variant) {
    case "duration":
      seconds = duration;
      formatted = formatTime(seconds);
      label = labels.timeDuration(formatted);
      break;
    case "remaining":
      seconds = Math.max(0, duration - currentTime);
      formatted = formatTime(seconds);
      label = labels.timeRemaining(formatted);
      break;
    default:
      seconds = currentTime;
      formatted = formatTime(seconds);
      label = labels.timeCurrent(formatted);
  }

  return (
    <time
      className={className}
      aria-label={label}
      dateTime={`PT${Math.round(seconds)}S`}
      data-f8-player-control="time"
      data-variant={variant}
    >
      {formatted}
    </time>
  );
}
