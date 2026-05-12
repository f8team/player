import type { PlayerEvents } from "@f8/player-core";
import { useEffect, useRef } from "react";

import { usePlayerContext } from "../context/PlayerContext.js";

/**
 * Subscribe to a typed player event. The handler is kept stable via a ref so
 * registering/deregistering is O(1) per render even if the caller passes an
 * inline function.
 *
 * @example
 * usePlayerEvent("ended", () => analytics.track("video_ended"));
 * usePlayerEvent("error", (err) => console.error(err));
 */
export function usePlayerEvent<K extends keyof PlayerEvents>(
  event: K,
  handler: (payload: PlayerEvents[K]) => void,
): void {
  const { player } = usePlayerContext();

  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const stable = (payload: PlayerEvents[K]): void => handlerRef.current(payload);
    return player.on(event, stable);
  }, [player, event]);
}
