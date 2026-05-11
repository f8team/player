/**
 * Public types of `@f8/player-core`.
 *
 * Every type exported from here is part of the frozen API contract — see
 * `docs/spec/api-contract.md`. Internal types live in `src/internal/`.
 */

export type { PlayerError, PlayerErrorCode } from "./error.js";
export type { PlayerEvents, UnauthorizedEvent } from "./events.js";
export type { AutoplayMode, KeyboardScope, PlayerHooks, PlayerOptions } from "./options.js";
export type { Disposer, Player } from "./player.js";
export type { CommandRegistry, PluginHost, PluginInstance } from "./plugin.js";
export type {
  QualityLevel,
  SourceDescriptor,
  SourceLoader,
  SourceProvider,
  SourceType,
  SubtitleTrack,
} from "./source.js";
export type { BufferedRange, PlayerState, PlayerStatus } from "./state.js";
export type { MutableStore, ReadableStore } from "./store.js";
export type { ThemeName, ThemeTokens } from "./theme.js";
