export {
  DEFAULT_F8_GATEWAY_ALLOWLIST,
  DEFAULT_F8_KEYBOARD,
  createF8WebPlayerPlugins,
  type F8WebPlayerPluginsOptions,
} from "./createF8WebPlayerPlugins.js";

// Phase 5 one-liner (React). Pulls in `@f8/player-react` — peer dep declared in
// package.json.
export { F8WebPlayer } from "./F8WebPlayer.js";
export type { F8WebPlayerProps, F8WebPlayerLight } from "./F8WebPlayer.js";

// Phase 5 one-liner (Lit). Pulls in `@f8/player-lit` as optional peer.
export { F8WebPlayerElement, defineF8WebPlayer } from "./F8WebPlayerLit.js";

// Convenience re-exports so consumers don't import from `@f8/player-react`
// separately when using the one-liner.
export {
  vietnameseLabels,
  defaultLabels,
  type PlayerLabels,
  type PlayerCallbackProps,
} from "@f8/player-react";
