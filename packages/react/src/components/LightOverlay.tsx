import { type CSSProperties, useCallback } from "react";

import { usePlayer } from "../hooks/usePlayer.js";
import { useLabels } from "../i18n.js";

export interface LightOverlayProps {
  /**
   * Poster image URL shown above the play button. Optional — when omitted,
   * only the big-play button is rendered (no broken `<img>`).
   */
  posterUrl?: string;
  /**
   * Called when the overlay is clicked. Use to flip your `light` state to
   * `false`. The plugin also fires `player.play()` automatically — pass
   * `autoPlayOnDismiss={false}` if you want to control the play step yourself.
   */
  onDismiss?: () => void;
  /** Auto-start playback when the user clicks the overlay. Default `true`. */
  autoPlayOnDismiss?: boolean;
  /** Optional `aria-label` override for the play button (defaults to `labels.posterPlay`). */
  playLabel?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * `<Player.LightOverlay />` — poster image + big-play button shown before
 * the user starts playback. Click anywhere on the overlay dismisses it and
 * starts playback.
 *
 * Replaces the consumer-side `LightOverlay` in f8-ui. Pure DOM primitive
 * with no visual styling baked in — theme via the `data-*` attributes in
 * `docs/spec/styling-contract.md` or Tailwind arbitrary variants.
 *
 * @phase-4-target T4.1
 */
export function LightOverlay({
  posterUrl,
  onDismiss,
  autoPlayOnDismiss = true,
  playLabel,
  className,
  style,
}: LightOverlayProps): JSX.Element {
  const player = usePlayer();
  const labels = useLabels();

  const handleDismiss = useCallback(() => {
    onDismiss?.();
    if (autoPlayOnDismiss) {
      // Fire-and-forget — autoplay rejection is surfaced via the player's
      // `error` event so we don't need to handle it here.
      player.play().catch(() => undefined);
    }
  }, [autoPlayOnDismiss, onDismiss, player]);

  return (
    <div
      data-f8p-light-overlay=""
      className={className}
      style={style}
      onClick={handleDismiss}
      role="button"
      tabIndex={0}
      aria-label={playLabel ?? labels.posterPlay}
    >
      {posterUrl && <img data-f8p-light-poster="" src={posterUrl} alt="" />}
      <button
        data-f8p-light-play-button=""
        type="button"
        aria-label={playLabel ?? labels.posterPlay}
        onClick={(e) => {
          // Stop the wrapper's onClick from firing twice when the click
          // lands directly on the button.
          e.stopPropagation();
          handleDismiss();
        }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48" aria-hidden="true">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>
    </div>
  );
}
