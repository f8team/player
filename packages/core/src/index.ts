/**
 * `@f8/player-core` — headless, framework-agnostic video player engine.
 *
 * Public surface is frozen in `docs/spec/api-contract.md`. Internals live
 * behind the `@f8/player-core/internal` subpath and are not semver-protected.
 */

export { createPlayer } from "./createPlayer.js";
export { definePlugin } from "./plugins/definePlugin.js";
export { applyTheme, resolveTokens } from "./theme/apply.js";
export { DEFAULT_TOKENS, THEME_PRESETS, TOKEN_TO_CSS_VAR } from "./theme/tokens.js";
export { announce } from "./a11y/announce.js";
export { createFocusTrap } from "./a11y/focusTrap.js";
export { formatTime, parseTime, toSeconds } from "./util/time.js";
export {
  detectSourceType,
  looksLikeHls,
  looksLikeProgressive,
  looksLikeYouTube,
} from "./util/url.js";

export type {
  AutoplayMode,
  BufferedRange,
  CommandRegistry,
  Disposer,
  KeyboardScope,
  MutableStore,
  Player,
  PlayerError,
  PlayerErrorCode,
  PlayerEvents,
  PlayerHooks,
  PlayerOptions,
  PlayerState,
  PlayerStatus,
  PluginHost,
  PluginInstance,
  QualityLevel,
  ReadableStore,
  SourceDescriptor,
  SourceLoader,
  SourceProvider,
  SourceType,
  SubtitleTrack,
  ThumbnailsDescriptor,
  ThemeName,
  ThemeTokens,
  UnauthorizedEvent,
} from "./types/index.js";
