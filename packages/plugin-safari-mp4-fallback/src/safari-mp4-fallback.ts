import type { Player, PluginHost, PluginInstance, SourceDescriptor } from "@f8/player-core";

export interface SafariMp4FallbackPluginOptions {
  /**
   * Callback that returns the MP4 URL for a given HLS source URL.
   * Return `null` to signal no fallback is available.
   */
  resolveMp4?: (hlsSrc: string) => string | null;
}

const PLUGIN_NAME = "safari-mp4-fallback";

function isSafariDesktop(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // Safari on macOS: contains "Safari" but not "Chrome" or "Chromium",
  // and not mobile (no "iPhone" / "iPad" in UA).
  return (
    ua.includes("Safari") &&
    !ua.includes("Chrome") &&
    !ua.includes("Chromium") &&
    !ua.includes("iPhone") &&
    !ua.includes("iPad")
  );
}

/**
 * Safari MP4 fallback plugin.
 *
 * On desktop Safari, HLS is natively supported, but some upload pipelines
 * produce broken HLS. This plugin transparently swaps the source to a
 * direct MP4 URL when running on desktop Safari and a `resolveMp4`
 * callback is provided.
 *
 * The swap happens before the source loads by intercepting the
 * `player.on("error")` with code `"source"` and retrying with the MP4.
 *
 * For simpler setups, `resolveMp4` can just replace `.m3u8` → `.mp4`.
 *
 * Golden case: G4 (desktop Safari upload preview).
 */
export function createSafariMp4FallbackPlugin(
  options: SafariMp4FallbackPluginOptions = {},
): PluginInstance {
  const { resolveMp4 = (src) => src.replace(/\.m3u8(\?.*)?$/, ".mp4") } = options;

  return {
    name: PLUGIN_NAME,

    setup(player: Player, _host: PluginHost): () => void {
      if (!isSafariDesktop()) {
        return () => undefined;
      }

      let retried = false;

      const offError = player.on("error", (err) => {
        if (retried) return;
        if (err.code !== "source" && err.code !== "network") return;

        const src = player.getSource()?.src;
        if (!src) return;

        const mp4 = resolveMp4(src);
        if (!mp4 || mp4 === src) return;

        retried = true;
        const current = player.getSource();
        const newSource: SourceDescriptor = {
          ...(current ?? { src: mp4 }),
          src: mp4,
          type: "mp4",
        };
        player.setSource(newSource);
      });

      return () => {
        offError();
      };
    },
  };
}
