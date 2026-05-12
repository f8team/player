/**
 * `@f8/player-lit` — Lit adapter for `@f8/player-core`.
 *
 * Ships a single custom element `<f8-player>` + a `PlayerController` Reactive
 * Controller for advanced consumers who want to compose their own elements.
 *
 * ## Quick start
 *
 * ```ts
 * import { defineF8Player } from "@f8/player-lit";
 * defineF8Player();
 * ```
 *
 * ```html
 * <f8-player .options=${{ source: { src: "https://cdn/video.m3u8" } }}>
 *   <my-controls slot="controls"></my-controls>
 * </f8-player>
 * ```
 *
 * ## Advanced — Reactive Controller
 *
 * ```ts
 * import { PlayerController } from "@f8/player-lit";
 *
 * class MyPlayer extends LitElement {
 *   readonly player = new PlayerController(this, () => this.options);
 *
 *   firstUpdated() {
 *     const video = this.renderRoot.querySelector("video")!;
 *     this.player.attach(video);
 *   }
 * }
 * ```
 *
 * Element registration is **opt-in**: call `defineF8Player()` once at app
 * startup. This avoids `customElements.define` crashes when the package is
 * loaded twice (e.g. across micro-frontends).
 */

export { F8PlayerElement, defineF8Player } from "./F8Player.js";
export { PlayerController } from "./PlayerController.js";

// Re-export core types so consumers don't need a second import for typing.
export type {
  Player,
  PlayerEvents,
  PlayerOptions,
  PlayerState,
  SourceDescriptor,
  SubtitleTrack,
} from "@f8/player-core";
