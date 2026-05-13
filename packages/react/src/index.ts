/**
 * `@f8/player-react` — React adapter for `@f8/player-core`.
 *
 * ## Quick start (one-liner)
 * ```tsx
 * import { Player } from "@f8/player-react";
 *
 * <Player options={{ source: { src: "https://cdn.example.com/video.m3u8" } }} />
 * ```
 *
 * ## Composable (Slot API)
 * ```tsx
 * import { Player } from "@f8/player-react";
 *
 * <Player.Root options={{ source: { src: "..." } }}>
 *   <Player.Video className="w-full" />
 *   <Player.Captions />
 *   <Player.Controls.Bar>
 *     <Player.Controls.PlayPause />
 *     <Player.Controls.SeekBar />
 *     <Player.Controls.Time variant="current" />
 *   </Player.Controls.Bar>
 * </Player.Root>
 * ```
 */

// One-liner + handle
export { PlayerComponent as Player } from "./components/PlayerComponent.js";
export type { PlayerComponentProps, PlayerHandle } from "./components/PlayerComponent.js";

// Composable slot API
export { Root } from "./components/Root.js";
export type { RootProps } from "./components/Root.js";

export { Video } from "./components/Video.js";
export type { VideoProps } from "./components/Video.js";

export { Captions } from "./components/Captions.js";

export { Spinner } from "./components/Spinner.js";
export type { SpinnerProps } from "./components/Spinner.js";

export { LightOverlay } from "./components/LightOverlay.js";
export type { LightOverlayProps } from "./components/LightOverlay.js";

export * as Controls from "./components/controls/index.js";

// Hooks
export { usePlayer } from "./hooks/usePlayer.js";
export { usePlayerEvent } from "./hooks/usePlayerEvent.js";
export { usePlayerState } from "./hooks/usePlayerState.js";
export { useSourceType } from "./hooks/useSourceType.js";
export { usePluginCommand } from "./hooks/usePluginCommand.js";
export { useCallbackProps, type PlayerCallbackProps } from "./hooks/useCallbackProps.js";

export { blurFocusInside } from "./dom/blurFocusInside.js";

// i18n — public OSS surface defaults to English; opt into Vietnamese via the
// `vietnameseLabels` preset or pass a partial override to `<Player.Root>`.
export { defaultLabels, vietnameseLabels, useLabels, type PlayerLabels } from "./i18n.js";
