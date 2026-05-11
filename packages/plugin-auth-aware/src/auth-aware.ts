import type { Player, PluginHost, PluginInstance } from "@f8/player-core";

export interface AuthAwarePluginOptions {
  /**
   * List of URL prefixes that require `withCredentials: true`.
   * e.g. `["https://api-gateway.f8.edu.vn"]`.
   */
  allowlist?: string[];
  /**
   * Callback invoked when a 401 / 403 is received from the media server.
   * Use this to show a "login required" modal or refresh the token.
   */
  onUnauthorized?: (url: string, status: 401 | 403) => void;
  /**
   * Whether to automatically pause playback when unauthorized.
   * Defaults to `true`.
   */
  pauseOnUnauthorized?: boolean;
}

const PLUGIN_NAME = "auth-aware";

/**
 * Auth-aware plugin.
 *
 * Listens for player `error` events with code `"unauthorized"` and invokes
 * the `onUnauthorized` callback. Optionally pauses playback.
 *
 * For `withCredentials` URL matching, the source URL is checked against
 * `allowlist` on source load — delegates to the HLS loader's
 * `hls:setWithCredentials` command if available.
 *
 * Golden case: G13 (authenticated HLS stream via api-gateway).
 */
export function createAuthAwarePlugin(options: AuthAwarePluginOptions = {}): PluginInstance {
  const {
    allowlist = [],
    onUnauthorized,
    pauseOnUnauthorized = true,
  } = options;

  return {
    name: PLUGIN_NAME,

    setup(player: Player, _host: PluginHost): () => void {
      // Apply withCredentials for matching sources.
      const applyCredentials = (): void => {
        const src = player.getSource()?.src ?? "";
        const needs = allowlist.some((prefix) => src.startsWith(prefix));
        if (needs && player.commands.has("hls:setWithCredentials")) {
          player.commands.run("hls:setWithCredentials", true);
        }
      };

      const offReady = player.on("ready", applyCredentials);

      const offError = player.on("error", (err) => {
        if (err.code !== "unauthorized") return;
        const src = player.getSource()?.src ?? "";
        const status: 401 | 403 = err.message?.includes("403") ? 403 : 401;
        onUnauthorized?.(src, status);
        if (pauseOnUnauthorized && player.getState().status === "playing") {
          player.pause();
        }
      });

      const offUnauthorized = player.on("unauthorized", (e) => {
        onUnauthorized?.(e.url, e.status);
        if (pauseOnUnauthorized && player.getState().status === "playing") {
          player.pause();
        }
      });

      return () => {
        offReady();
        offError();
        offUnauthorized();
      };
    },
  };
}
