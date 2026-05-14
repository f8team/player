export {
  DEFAULT_REEL_GATEWAY_ALLOWLIST,
  DEFAULT_REEL_KEYBOARD,
  createReelWebPlayerPlugins,
  type ReelWebPlayerPluginsOptions,
} from "./createReelWebPlayerPlugins.js";

// Phase 5 one-liner (React). Pulls in `@f8team/reel-react` — peer dep declared in
// package.json.
export { ReelWebPlayer } from "./ReelWebPlayer.js";
export type { ReelWebPlayerProps, ReelWebPlayerLight } from "./ReelWebPlayer.js";

// Phase 5 one-liner (Lit). Pulls in `@f8team/reel-lit` as optional peer.
export { ReelWebPlayerElement, defineReelWebPlayer } from "./ReelWebPlayerLit.js";

// Convenience re-exports so consumers don't import from `@f8team/reel-react`
// separately when using the one-liner.
export {
  vietnameseLabels,
  defaultLabels,
  type PlayerLabels,
  type PlayerCallbackProps,
} from "@f8team/reel-react";
