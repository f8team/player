import type { Player, PlayerOptions } from "@f8team/reel-core";
import { createContext, useContext } from "react";

export interface PlayerContextValue {
  player: Player;
  options: PlayerOptions;
  /**
   * Reactive poster URL — driven by the `poster` prop on `<Root>`. Falls back
   * to `options.poster` (the once-on-mount seed) when the prop is undefined.
   * `<Video>` reads this and applies it to the underlying `<video poster>`.
   */
  poster?: string;
}

export const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayerContext(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error("[@f8team/reel-react] usePlayer* hooks must be used inside <Player.Root>.");
  }
  return ctx;
}
