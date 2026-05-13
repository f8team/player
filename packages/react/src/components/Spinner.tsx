import { type CSSProperties, useState } from "react";

import { usePlayerEvent } from "../hooks/usePlayerEvent.js";
import { useLabels } from "../i18n.js";

export interface SpinnerProps {
  /** Optional class forwarded to the outer wrapper. */
  className?: string;
  /** Optional inline style override. */
  style?: CSSProperties;
}

/**
 * `<Player.Spinner />` — center playback spinner shown while the player is
 * buffering or switching HLS qualities.
 *
 * Replaces the boilerplate `CenterPlaybackSpinner` each consumer (f8-ui,
 * f8-dash-ui) used to write. Pure DOM primitive — no visual styling baked in.
 * Style via `data-f8-player-center-spinner` + the `[data-f8-player-…]` set
 * documented in `docs/spec/styling-contract.md`, or via Tailwind arbitrary
 * variants.
 *
 * @phase-4-target T4.1
 */
export function Spinner({ className, style }: SpinnerProps = {}): JSX.Element | null {
  const [qualitySwitch, setQualitySwitch] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const labels = useLabels();

  usePlayerEvent("qualityswitch", ({ active }) => setQualitySwitch(active));
  usePlayerEvent("buffering", ({ isBuffering }) => setBuffering(isBuffering));

  const active = qualitySwitch || buffering;
  if (!active) return null;

  // Disambiguate "what is the user waiting for?" with a localized aria-label.
  // Same shape as f8-ui CenterPlaybackSpinner so screen readers keep parity.
  const ariaLabel =
    qualitySwitch && !buffering
      ? labels.bufferingQuality
      : buffering && !qualitySwitch
        ? labels.bufferingPlayback
        : labels.bufferingGeneric;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      data-f8-player-center-spinner=""
      className={className}
      style={style}
    >
      <div data-f8p-spinner-dot="" />
    </div>
  );
}
