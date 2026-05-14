import type { Player, PluginHost, PluginInstance, QualityLevel } from "@f8team/reel-core";

const PLUGIN_NAME = "hls-quality";

/**
 * HLS quality plugin.
 *
 * Registers two commands:
 * - `hls-quality:set` — switch to a specific `QualityLevel` object.
 * - `hls-quality:setAuto` — switch back to ABR auto mode.
 *
 * Quality switching is delegated to the active HLS loader via
 * `player.commands.run("hls:setQuality", quality)` which is registered by
 * the HLS source provider inside `@f8team/reel-core`.
 *
 * If the player is using a non-HLS source or the command doesn't exist,
 * the calls are silently no-ops.
 *
 * Golden case: G7 (HLS quality selection in course video editor).
 */
export function createHlsQualityPlugin(): PluginInstance {
  return {
    name: PLUGIN_NAME,

    setup(player: Player, host: PluginHost): () => void {
      const disposeSet = host.commands.add("hls-quality:set", (quality: unknown) => {
        player.commands.run("hls:setQuality", quality);
      });

      const disposeAuto = host.commands.add("hls-quality:setAuto", () => {
        player.commands.run("hls:setQuality", null);
      });

      // Expose the current qualities list as a convenience event when the
      // source changes.
      const offReady = player.on("ready", () => {
        const { qualities } = player.getState();
        host.emit("hls-quality:qualitiesChanged", qualities);
      });

      const unsub = player.subscribe(
        (s) => s.qualities,
        (qualities: QualityLevel[]) => {
          host.emit("hls-quality:qualitiesChanged", qualities);
        },
      );

      return () => {
        disposeSet();
        disposeAuto();
        offReady();
        unsub();
      };
    },
  };
}
