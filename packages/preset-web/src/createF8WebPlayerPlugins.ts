import type { PluginInstance } from "@f8/player-core";
import type { AuthAwarePluginOptions } from "@f8/player-plugin-auth-aware";
import { createAuthAwarePlugin } from "@f8/player-plugin-auth-aware";
import { createFullscreenPlugin } from "@f8/player-plugin-fullscreen";
import { createHlsQualityPlugin } from "@f8/player-plugin-hls-quality";
import type { KeyboardPluginOptions } from "@f8/player-plugin-keyboard";
import { createKeyboardPlugin } from "@f8/player-plugin-keyboard";
import type { MarkersPluginOptions } from "@f8/player-plugin-markers";
import { createMarkersPlugin } from "@f8/player-plugin-markers";
import { createPipPlugin } from "@f8/player-plugin-pip";
import type { PrefsPluginOptions } from "@f8/player-plugin-prefs";
import { createPrefsPlugin } from "@f8/player-plugin-prefs";
import type { SubtitlesPluginOptions } from "@f8/player-plugin-subtitles";
import { createSubtitlesPlugin } from "@f8/player-plugin-subtitles";
import type { ThumbnailsPluginOptions } from "@f8/player-plugin-thumbnails";

/** Canonical keyboard defaults — matches f8-pro-ui `<video-player>` inner mount. */
export const DEFAULT_F8_KEYBOARD: KeyboardPluginOptions = {
  scope: "global",
  seekStep: 5,
  longSeekStep: 10,
};

/**
 * Allowlist aligned with learner + admin surfaces (regex requires the dot after
 * `api-gateway` — avoids prefix false positives vs string form).
 *
 * Consumers may still spread or override entries in `{ auth }`.
 */
export const DEFAULT_F8_GATEWAY_ALLOWLIST: NonNullable<AuthAwarePluginOptions["allowlist"]> = [
  /^https:\/\/api-gateway\./,
];

export interface F8WebPlayerPluginsOptions {
  /**
   * When set, prepend markers/chapter/transcript-dot plugin (`markers` variant).
   * Omit or `false` to skip.
   */
  markers?: false | MarkersPluginOptions;

  /**
   * Install `@f8/player-plugin-keyboard`.
   *
   * - Pass `false` to skip (f8-ui uses custom `document.body` scoped Space/arrows).
   * - Omit to use [`DEFAULT_F8_KEYBOARD`].
   */
  keyboard?: false | KeyboardPluginOptions;

  /** HLS manual quality tier menu. Default `true`. */
  hlsQuality?: boolean;

  fullscreen?: boolean;
  pip?: boolean;

  /** Lazy-load thumbnails plugin once the active source exposes sprite thumbnails. */
  thumbnails?: "always" | false | ThumbnailsPluginOptions;

  /**
   * Auth-aware gateway cookies / unauthorized signalling.
   * Pass `false` to omit (Pro uses [`createRefreshTokenController`] separately).
   */
  auth?: false | AuthAwarePluginOptions;

  /**
   * Native `TextTrack` manager for VTT bundled on `<video>`.
   * Pass `false` to omit entirely.
   */
  subtitles?: false | SubtitlesPluginOptions;

  /**
   * Persist user prefs (volume, muted, playbackRate, qualityHeight) to
   * `localStorage` and restore them on `ready`. Default `{}` (enabled with
   * default storage key `"f8-player:prefs"`).
   *
   * Pass `false` to opt out — typical when the consumer attaches its own
   * pref manager (legacy `f8-pro-ui` `persistPrefs` flag handled the same
   * concern at the outer custom element level).
   *
   * Phase 5 T5.1.
   */
  prefs?: false | PrefsPluginOptions;
}

/**
 * Build the standard F8-web plugin tuple in a stable merge order across apps.
 *
 * Order: markers → keyboard → [hls-quality] → auth → fullscreen → pip → subtitles → thumbnails.
 */
export function createF8WebPlayerPlugins(options: F8WebPlayerPluginsOptions): PluginInstance[] {
  const {
    markers,
    keyboard,
    hlsQuality = true,
    fullscreen = true,
    pip = true,
    thumbnails = "always",
    auth,
    subtitles,
    prefs,
  } = options;

  const plugins: PluginInstance[] = [];

  if (markers) {
    plugins.push(createMarkersPlugin(markers));
  }

  if (keyboard !== false) {
    const kOpts = keyboard === undefined ? DEFAULT_F8_KEYBOARD : keyboard;
    const scopeOff = !kOpts || kOpts.scope === "off";
    if (!scopeOff) {
      plugins.push(createKeyboardPlugin(kOpts));
    }
  }

  if (hlsQuality) plugins.push(createHlsQualityPlugin());

  if (auth !== false && auth !== undefined) {
    plugins.push(createAuthAwarePlugin(auth));
  }

  if (fullscreen) plugins.push(createFullscreenPlugin());
  if (pip) plugins.push(createPipPlugin());

  if (subtitles !== false && subtitles !== undefined) {
    plugins.push(createSubtitlesPlugin(subtitles));
  }

  if (thumbnails !== false) {
    plugins.push(createLazyThumbnailsPlugin(thumbnails === "always" ? {} : thumbnails));
  }

  // Prefs comes LAST so its `ready`/`play` restore runs after subtitles/HLS
  // quality plugins have registered their commands.
  if (prefs !== false) {
    plugins.push(createPrefsPlugin(prefs ?? {}));
  }

  return plugins;
}

function hasPreviewThumbnails(
  source: { thumbnails?: { src?: string } } | null | undefined,
): boolean {
  return !!source?.thumbnails?.src;
}

function createLazyThumbnailsPlugin(options: ThumbnailsPluginOptions = {}): PluginInstance {
  return {
    name: "thumbnails-lazy",
    setup(player, host) {
      let disposed = false;
      let loading = false;
      let loaded = player.commands.has("thumbnails:reload");

      const load = (): void => {
        if (disposed || loading || loaded) return;
        if (!hasPreviewThumbnails(host.store.getState().source)) return;

        loading = true;
        import("@f8/player-plugin-thumbnails")
          .then(({ createThumbnailsPlugin }) => {
            loading = false;
            if (disposed) return;
            if (player.commands.has("thumbnails:reload")) {
              loaded = true;
              return;
            }
            player.use(createThumbnailsPlugin(options));
            loaded = true;
          })
          .catch(() => {
            loading = false;
            host.emit("thumbnails:cleared", undefined);
          });
      };

      const unsubscribe = host.store.subscribe(
        (state) => state.source?.thumbnails?.src ?? null,
        () => load(),
      );
      load();

      return () => {
        disposed = true;
        unsubscribe();
        if (loaded) player.removePlugin("thumbnails");
      };
    },
  };
}
