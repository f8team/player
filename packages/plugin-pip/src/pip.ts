import type { Player, PluginHost, PluginInstance } from "@f8team/reel-core";

const PLUGIN_NAME = "pip";

/**
 * Picture-in-Picture plugin.
 *
 * Registers the `pip:toggle` command. The command requests / exits PiP using
 * the native `requestPictureInPicture` / `exitPictureInPicture` API.
 *
 * The player state `pip` field is updated via the native
 * `enterpictureinpicture` / `leavepictureinpicture` video events
 * (handled internally by `createPlayer`).
 */
export function createPipPlugin(): PluginInstance {
  return {
    name: PLUGIN_NAME,

    setup(player: Player, host: PluginHost): () => void {
      let videoEl: HTMLVideoElement | null = null;

      // Capture the <video> element via the player's attach event.
      // We piggyback on the "ready" event which fires after attach.
      const offReady = player.on("ready", () => {
        // Access the underlying <video> by inspecting the document.
        const el = document.querySelector<HTMLVideoElement>("video[data-reel-video]");
        if (el) videoEl = el;
      });

      const disposeToggle = host.commands.add("pip:toggle", () => {
        if (!document.pictureInPictureEnabled) return;

        if (document.pictureInPictureElement) {
          document.exitPictureInPicture().catch(() => undefined);
        } else if (videoEl) {
          videoEl.requestPictureInPicture().catch(() => undefined);
        }
      });

      return () => {
        offReady();
        disposeToggle();
        videoEl = null;
      };
    },
  };
}
