import type { PlayerOptions } from "@f8team/reel-core";
import { ReelPlayerElement } from "@f8team/reel-lit";

import {
  DEFAULT_REEL_GATEWAY_ALLOWLIST,
  createReelWebPlayerPlugins,
  type ReelWebPlayerPluginsOptions,
} from "./createReelWebPlayerPlugins.js";

/**
 * `<reel-web-player>` — opinionated Lit one-liner that bundles the F8 defaults
 * around `<reel-player>`:
 *
 * - Standard plugin tuple via `createReelWebPlayerPlugins` (incl. `prefs`).
 * - Default auth-aware allowlist for `api-gateway.*`.
 * - Reactive `source` (inherited from `<reel-player>`).
 * - Reactive `playbackRate` (uses native Lit property + player setter wired via
 *   the parent class's `applyInitialOptions` / programmatic setters).
 * - Controls rendered by the base element when `controls=true` (default).
 *
 * Usage:
 *
 * ```html
 * <reel-web-player
 *   .source=${{ src: "https://cdn/video.m3u8" }}
 *   theme="classroom"
 *   controls
 * ></reel-web-player>
 * ```
 *
 * Tag: `<reel-web-player>` (registered idempotently by `defineReelWebPlayer()`).
 *
 * @phase-5-target T5.4
 */
export class ReelWebPlayerElement extends ReelPlayerElement {
  /**
   * Plugin tuple option overrides for `createReelWebPlayerPlugins`. Default
   * uses the F8 gateway allowlist + auth-aware + prefs + all standard plugins.
   * Set to `null` to skip the plugin tuple entirely (rare — only when you bring
   * your own).
   */
  pluginsConfig: ReelWebPlayerPluginsOptions | null = null;

  /**
   * Render the default controls. Mirrors `ReelPlayerElement.controls` but
   * defaults to `true` here (one-liner expectation is "show controls").
   */
  override controls = true;

  /** Default theme to `classroom` so the F8 chrome ships without extra props. */
  override theme = "classroom";

  static override get properties() {
    return {
      ...ReelPlayerElement.properties,
      pluginsConfig: { attribute: false },
    };
  }

  override connectedCallback(): void {
    // Merge default plugins into options BEFORE the base class calls
    // `createPlayer` (which happens in `hostConnected` → first connectedCallback).
    if (!this.options) this.options = {};
    if (!this.options.plugins || this.options.plugins.length === 0) {
      const cfg = this.pluginsConfig ?? {};
      const merged: ReelWebPlayerPluginsOptions = {
        auth: { allowlist: DEFAULT_REEL_GATEWAY_ALLOWLIST },
        ...cfg,
      };
      const opts: PlayerOptions = {
        ...this.options,
        plugins: createReelWebPlayerPlugins(merged),
      };
      this.options = opts;
    }
    super.connectedCallback();
  }
}

let defined = false;
/**
 * Register `<reel-web-player>` on `customElements`. Idempotent — safe to call
 * multiple times.
 */
export function defineReelWebPlayer(tag = "reel-web-player"): void {
  if (defined) return;
  if (typeof customElements === "undefined") return;
  if (!customElements.get(tag)) {
    customElements.define(tag, ReelWebPlayerElement);
  }
  defined = true;
}
