import type { Player, PluginHost, PluginInstance } from "@f8/player-core";

export interface FullscreenPluginOptions {
  /**
   * Element to fullscreen. Defaults to the player container
   * (`data-f8-player` attribute) or the `<video>` element itself.
   */
  getContainer?: () => Element | null;
}

const PLUGIN_NAME = "fullscreen";

/**
 * Fullscreen plugin. Registers the `fullscreen:toggle` command.
 *
 * Uses the standard Fullscreen API (`requestFullscreen` / `exitFullscreen`).
 * The player state `fullscreen` field is updated via `fullscreenchange` events.
 */
export function createFullscreenPlugin(options: FullscreenPluginOptions = {}): PluginInstance {
  return {
    name: PLUGIN_NAME,

    setup(_player: Player, host: PluginHost): () => void {
      const getEl = (): Element | null => {
        if (options.getContainer) return options.getContainer();
        return (
          document.querySelector("[data-f8-player]") ??
          document.querySelector("video[data-f8-player-video]") ??
          null
        );
      };

      const onFullscreenChange = (): void => {
        // The player's store is updated externally via fullscreenchange on the
        // video element inside createPlayer. This handler is kept as a hook
        // for future extension.
      };

      document.addEventListener("fullscreenchange", onFullscreenChange);

      const disposeToggle = host.commands.add("fullscreen:toggle", () => {
        if (!document.fullscreenEnabled) return;
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => undefined);
        } else {
          const el = getEl();
          if (el) {
            (el as HTMLElement).requestFullscreen().catch(() => undefined);
          }
        }
      });

      return () => {
        document.removeEventListener("fullscreenchange", onFullscreenChange);
        disposeToggle();
      };
    },
  };
}
