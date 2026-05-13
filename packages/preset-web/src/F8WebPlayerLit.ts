import type { PlayerOptions } from "@f8/player-core";
import { F8PlayerElement } from "@f8/player-lit";

import {
  DEFAULT_F8_GATEWAY_ALLOWLIST,
  createF8WebPlayerPlugins,
  type F8WebPlayerPluginsOptions,
} from "./createF8WebPlayerPlugins.js";

/**
 * `<f8-web-player>` — opinionated Lit one-liner that bundles the F8 defaults
 * around `<f8-player>`:
 *
 * - Standard plugin tuple via `createF8WebPlayerPlugins` (incl. `prefs`).
 * - Default auth-aware allowlist for `api-gateway.*`.
 * - Reactive `source` (inherited from `<f8-player>`).
 * - Reactive `playbackRate` (uses native Lit property + player setter wired via
 *   the parent class's `applyInitialOptions` / programmatic setters).
 * - Controls rendered by the base element when `controls=true` (default).
 *
 * Usage:
 *
 * ```html
 * <f8-web-player
 *   .source=${{ src: "https://cdn/video.m3u8" }}
 *   theme="classroom"
 *   controls
 * ></f8-web-player>
 * ```
 *
 * Tag: `<f8-web-player>` (registered idempotently by `defineF8WebPlayer()`).
 *
 * @phase-5-target T5.4
 */
export class F8WebPlayerElement extends F8PlayerElement {
  /**
   * Plugin tuple option overrides for `createF8WebPlayerPlugins`. Default
   * uses the F8 gateway allowlist + auth-aware + prefs + all standard plugins.
   * Set to `null` to skip the plugin tuple entirely (rare — only when you bring
   * your own).
   */
  pluginsConfig: F8WebPlayerPluginsOptions | null = null;

  /**
   * Render the default controls. Mirrors `F8PlayerElement.controls` but
   * defaults to `true` here (one-liner expectation is "show controls").
   */
  override controls = true;

  /** Default theme to `classroom` so the F8 chrome ships without extra props. */
  override theme = "classroom";

  static override get properties() {
    return {
      ...F8PlayerElement.properties,
      pluginsConfig: { attribute: false },
    };
  }

  override connectedCallback(): void {
    // Merge default plugins into options BEFORE the base class calls
    // `createPlayer` (which happens in `hostConnected` → first connectedCallback).
    if (!this.options) this.options = {};
    if (!this.options.plugins || this.options.plugins.length === 0) {
      const cfg = this.pluginsConfig ?? {};
      const merged: F8WebPlayerPluginsOptions = {
        auth: { allowlist: DEFAULT_F8_GATEWAY_ALLOWLIST },
        ...cfg,
      };
      const opts: PlayerOptions = {
        ...this.options,
        plugins: createF8WebPlayerPlugins(merged),
      };
      this.options = opts;
    }
    super.connectedCallback();
  }
}

let defined = false;
/**
 * Register `<f8-web-player>` on `customElements`. Idempotent — safe to call
 * multiple times.
 */
export function defineF8WebPlayer(tag = "f8-web-player"): void {
  if (defined) return;
  if (typeof customElements === "undefined") return;
  if (!customElements.get(tag)) {
    customElements.define(tag, F8WebPlayerElement);
  }
  defined = true;
}
