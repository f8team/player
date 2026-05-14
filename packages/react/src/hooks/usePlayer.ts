import type { Player } from "@f8team/reel-core";

import { usePlayerContext } from "../context/PlayerContext.js";

/**
 * Access the raw {@link Player} instance. Use this for imperative calls such as
 * `play()`, `seekTo()`, `setSource()`, etc.
 *
 * Prefer {@link usePlayerState} for reactive reads — it re-renders only when
 * the relevant slice of state changes.
 */
export function usePlayer(): Player {
  return usePlayerContext().player;
}
