import { createPlayer } from "@f8/player-core";
import type { PlayerOptions } from "@f8/player-core";
import { type ReactNode, useEffect, useMemo, useRef } from "react";

import { PlayerContext } from "../context/PlayerContext.js";

export interface RootProps {
  /**
   * `createPlayer` options. Passed once on mount; changes after mount are
   * ignored (same contract as `createPlayer` — use `player.setSource` etc. for
   * reactive updates).
   */
  options?: PlayerOptions;
  children?: ReactNode;
  /** Optional ref-style callback to access the player instance imperatively. */
  playerRef?: ((player: ReturnType<typeof createPlayer>) => void) | null;
}

/**
 * `<Player.Root>` — creates and owns one `createPlayer` instance for its
 * subtree. Disposes on unmount.
 *
 * All hooks and primitives must be rendered inside this component.
 */
export function Root({ options = {}, children, playerRef }: RootProps): JSX.Element {
  // Options are read once on mount; subsequent changes are silently ignored.
  // This is intentional: the player is a long-lived imperative object.
  const optionsRef = useRef(options);

  const player = useMemo(() => createPlayer(optionsRef.current), []);

  // Forward the player to the optional callback ref.
  const playerRefCurrent = playerRef;
  useEffect(() => {
    playerRefCurrent?.(player);
  }, [player, playerRefCurrent]);

  // Dispose on unmount.
  useEffect(() => () => player.dispose(), [player]);

  const ctx = useMemo(() => ({ player, options: optionsRef.current }), [player]);

  return <PlayerContext.Provider value={ctx}>{children}</PlayerContext.Provider>;
}
