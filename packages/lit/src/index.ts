/**
 * `@f8team/reel-lit` — Lit adapter for `@f8team/reel-core`.
 *
 * Ships a single custom element `<reel-player>` + a `PlayerController` Reactive
 * Controller for advanced consumers who want to compose their own elements.
 *
 * ## Quick start
 *
 * ```ts
 * import { defineReelPlayer } from "@f8team/reel-lit";
 * defineReelPlayer();
 * ```
 *
 * ```html
 * <reel-player .options=${{ source: { src: "https://cdn/video.m3u8" } }}>
 *   <my-controls slot="controls"></my-controls>
 * </reel-player>
 * ```
 *
 * ## Advanced — Reactive Controller
 *
 * ```ts
 * import { PlayerController } from "@f8team/reel-lit";
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
 * Element registration is **opt-in**: call `defineReelPlayer()` once at app
 * startup. This avoids `customElements.define` crashes when the package is
 * loaded twice (e.g. across micro-frontends).
 */

export { ReelPlayerElement, defineReelPlayer } from "./ReelPlayer.js";
export { PlayerController } from "./PlayerController.js";

// Re-export core types so consumers don't need a second import for typing.
export type {
  Player,
  PlayerEvents,
  PlayerOptions,
  PlayerState,
  SourceDescriptor,
  SubtitleTrack,
} from "@f8team/reel-core";
