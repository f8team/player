/**
 * Memoized selectors over `PlayerState`.
 *
 * Selectors are pure functions of state. The store fires the listener only
 * when the selected slice changes (`Object.is`), so reference-stability
 * matters for arrays and objects.
 */

import { type QualityLevel } from "../types/source.js";
import { type BufferedRange, type PlayerState, type PlayerStatus } from "../types/state.js";

/* ------------------------------------------------------------------------- */
/* Identity selectors (cheap, no memo)                                        */
/* ------------------------------------------------------------------------- */

export const selectStatus = (s: PlayerState): PlayerStatus => s.status;
export const selectCurrentTime = (s: PlayerState): number => s.currentTime;
export const selectDuration = (s: PlayerState): number => s.duration;
export const selectVolume = (s: PlayerState): number => s.volume;
export const selectMuted = (s: PlayerState): boolean => s.muted;
export const selectPlaybackRate = (s: PlayerState): number => s.playbackRate;

/* ------------------------------------------------------------------------- */
/* Derived selectors                                                          */
/* ------------------------------------------------------------------------- */

/**
 * Whether the player is currently playing. True only for `status === "playing"`.
 */
export const selectIsPlaying = (s: PlayerState): boolean => s.status === "playing";

/**
 * Active quality level. `null` when ABR is auto or no qualities are exposed.
 */
export const selectActiveQuality = (s: PlayerState): QualityLevel | null => s.activeQuality;

/**
 * Memoized buffered ranges. Returns the same reference when the underlying
 * array contents are unchanged so subscribers don't re-fire.
 */
export const selectBufferedRanges: (state: PlayerState) => BufferedRange[] = (() => {
  let lastInput: BufferedRange[] | null = null;
  let lastOutput: BufferedRange[] = [];
  return (state: PlayerState) => {
    const next = state.buffered;
    if (lastInput && rangesEqual(lastInput, next)) return lastOutput;
    lastInput = next;
    lastOutput = next.slice();
    return lastOutput;
  };
})();

function rangesEqual(a: BufferedRange[], b: BufferedRange[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    if (!ai || !bi) return false;
    if (ai.start !== bi.start || ai.end !== bi.end) return false;
  }
  return true;
}
