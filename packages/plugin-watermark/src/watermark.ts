import type { Player, PluginHost, PluginInstance } from "@f8team/reel-core";

export interface WatermarkPluginOptions {
  /**
   * Text content for the watermark (e.g. `"F8 • username"`).
   */
  text: string;
  /**
   * CSS class to apply to the watermark element.
   * Use this to position and style via your theme CSS.
   */
  className?: string;
  /**
   * Slot to contribute the watermark to.
   * Defaults to `"overlay"`.
   */
  slot?: string;
}

const PLUGIN_NAME = "watermark";

/**
 * Watermark plugin — renders a premium overlay on top of the video.
 *
 * Contributes a `<div class="f8-watermark [className]">text</div>` to the
 * specified slot. The adapter renders slot contributions into the player DOM.
 *
 * CSS positioning is done via the theme or a custom `className`:
 *
 * ```css
 * .f8-watermark {
 *   position: absolute;
 *   bottom: 3.6rem;
 *   right: 1.6rem;
 *   opacity: 0.4;
 *   pointer-events: none;
 *   font-size: 1.2rem;
 *   color: white;
 *   user-select: none;
 * }
 * ```
 *
 * Golden case: Phase 8 wires the license check — this plugin only renders;
 * the license gate is external.
 */
export function createWatermarkPlugin(options: WatermarkPluginOptions): PluginInstance {
  const { text, className, slot = "overlay" } = options;

  return {
    name: PLUGIN_NAME,

    setup(_player: Player, host: PluginHost): () => void {
      const dispose = host.controls.contribute(slot, () => {
        const el = document.createElement("div");
        el.className = ["f8-watermark", className].filter(Boolean).join(" ");
        el.textContent = text;
        el.setAttribute("aria-hidden", "true");
        return el;
      });

      return () => {
        dispose();
      };
    },
  };
}
