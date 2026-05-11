import type { PlayerState } from "@f8/player-core";
import { useCallback, useEffect, useRef, useState } from "react";


import { usePlayerContext } from "../context/PlayerContext.js";

/**
 * Subscribe to a slice of player state. Re-renders only when the selected
 * slice changes (===).
 *
 * @example
 * const status = usePlayerState(s => s.status);
 * const currentTime = usePlayerState(s => s.currentTime);
 */
export function usePlayerState<T>(selector: (state: PlayerState) => T): T {
  const { player } = usePlayerContext();

  // Stable selector ref so the subscription doesn't re-register on every render.
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const stableSelector = useCallback(
    (state: PlayerState) => selectorRef.current(state),
    [],
  );

  const [value, setValue] = useState<T>(() =>
    stableSelector(player.getState()),
  );

  useEffect(() => {
    // Sync initial value in case the player state changed between the first
    // render and the effect registering.
    setValue(stableSelector(player.getState()));
    return player.subscribe(stableSelector, setValue);
  }, [player, stableSelector]);

  return value;
}
