import type { Player, PlayerState } from "@f8/player-core";
import { render, type RenderResult } from "@testing-library/react";
import { type ReactNode } from "react";

import { PlayerContext, type PlayerContextValue } from "../context/PlayerContext.js";
import { LabelsProvider, type PlayerLabels } from "../i18n.js";

import { makeMockPlayer } from "./mockPlayer.js";

export interface RenderWithPlayerOptions {
  initialState?: Partial<PlayerState>;
  player?: Player;
  /**
   * Override the label context for tests that need to assert localized
   * output. Defaults to English (LabelsProvider with `labels=undefined`).
   */
  labels?: Partial<PlayerLabels>;
}

export interface RenderWithPlayerResult extends RenderResult {
  player: Player;
  mockSetState: (patch: Partial<PlayerState>) => void;
  /**
   * Fire a synthetic plugin event (e.g. `thumbnails:ready`) on the mock
   * player. No-op when the test passed in a custom player instance.
   */
  mockEmit: (event: string, payload?: unknown) => void;
}

/**
 * Renders `ui` inside a mock `PlayerContext` so hooks work without a real
 * `createPlayer`. Returns the `mockSetState` helper to simulate state changes.
 */
export function renderWithPlayer(
  ui: ReactNode,
  { initialState = {}, player: externalPlayer, labels }: RenderWithPlayerOptions = {},
): RenderWithPlayerResult {
  const { player, mockSetState, mockEmit } = externalPlayer
    ? {
        player: externalPlayer,
        mockSetState: () => undefined,
        mockEmit: () => undefined,
      }
    : makeMockPlayer(initialState);

  const ctx: PlayerContextValue = {
    player,
    options: {},
  };

  const result = render(
    <PlayerContext.Provider value={ctx}>
      <LabelsProvider labels={labels}>{ui}</LabelsProvider>
    </PlayerContext.Provider>,
  );

  return { ...result, player, mockSetState, mockEmit };
}
