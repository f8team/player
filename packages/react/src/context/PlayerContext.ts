import type { Player, PlayerOptions } from "@f8/player-core";
import { createContext, useContext } from "react";


export interface PlayerContextValue {
  player: Player;
  options: PlayerOptions;
}

export const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayerContext(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error(
      "[@f8/player-react] usePlayer* hooks must be used inside <Player.Root>.",
    );
  }
  return ctx;
}
