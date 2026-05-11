import type { Player, PlayerState } from "@f8/player-core";
import { render, type RenderResult } from "@testing-library/react";
import { type ReactNode } from "react";

import { PlayerContext, type PlayerContextValue } from "../context/PlayerContext.js";

import { makeMockPlayer } from "./mockPlayer.js";


export interface RenderWithPlayerOptions {
  initialState?: Partial<PlayerState>;
  player?: Player;
}

export interface RenderWithPlayerResult extends RenderResult {
  player: Player;
  mockSetState: (patch: Partial<PlayerState>) => void;
}

/**
 * Renders `ui` inside a mock `PlayerContext` so hooks work without a real
 * `createPlayer`. Returns the `mockSetState` helper to simulate state changes.
 */
export function renderWithPlayer(
  ui: ReactNode,
  { initialState = {}, player: externalPlayer }: RenderWithPlayerOptions = {},
): RenderWithPlayerResult {
  const { player, mockSetState } = externalPlayer
    ? { player: externalPlayer, mockSetState: () => undefined }
    : makeMockPlayer(initialState);

  const ctx: PlayerContextValue = {
    player,
    options: {},
  };

  const result = render(
    <PlayerContext.Provider value={ctx}>{ui}</PlayerContext.Provider>,
  );

  return { ...result, player, mockSetState };
}
