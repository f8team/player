import type { Player, PluginHost, PluginInstance } from "@f8/player-core";

export interface SubtitlesPluginOptions {
  /**
   * Default language to activate. If a track with this `srcLang` exists,
   * it will be set to `showing` on attach.
   */
  defaultLang?: string;
  /**
   * Whether to disable subtitles by default. Overrides `defaultLang`.
   * Defaults to `false`.
   */
  off?: boolean;
}

export interface SubtitleTrackState {
  lang: string;
  label: string;
  mode: "showing" | "hidden" | "disabled";
}

const PLUGIN_NAME = "subtitles";

/**
 * Subtitles plugin.
 *
 * Manages the `TextTrack` objects on the `<video>` element. Registers:
 * - `subtitles:setLang` command — switch to a specific `srcLang`.
 * - `subtitles:off` command — hide all tracks.
 *
 * Emits `subtitles:changed` with the current `SubtitleTrackState[]` when
 * tracks change.
 *
 * Golden cases: G1 (course subtitles), G15 (VTT + crossOrigin="anonymous").
 */
export function createSubtitlesPlugin(options: SubtitlesPluginOptions = {}): PluginInstance {
  const { defaultLang, off: startOff = false } = options;

  return {
    name: PLUGIN_NAME,

    setup(_player: Player, host: PluginHost): () => void {
      let videoEl: HTMLVideoElement | null = null;

      const getVideo = (): HTMLVideoElement | null =>
        videoEl ?? document.querySelector<HTMLVideoElement>("video[data-f8-player-video]");

      const getTracks = (): TextTrack[] => {
        const el = getVideo();
        if (!el) return [];
        return Array.from(el.textTracks);
      };

      const applyDefault = (): void => {
        const tracks = getTracks();
        if (tracks.length === 0) return;

        tracks.forEach((t) => {
          t.mode = "hidden";
        });

        if (startOff) return;

        if (defaultLang) {
          const match = tracks.find((t) => t.language === defaultLang);
          if (match) {
            match.mode = "showing";
            host.emit("subtitles:changed", buildState(tracks));
            return;
          }
        }

        // Fall back to the first track marked `default`.
        const def = tracks.find((t) => (t as unknown as { default?: boolean }).default);
        if (def) def.mode = "showing";
        host.emit("subtitles:changed", buildState(tracks));
      };

      const buildState = (tracks: TextTrack[]): SubtitleTrackState[] =>
        tracks.map((t) => ({
          lang: t.language,
          label: t.label,
          mode: t.mode as SubtitleTrackState["mode"],
        }));

      const emitChanged = (): void => {
        host.emit("subtitles:changed", buildState(getTracks()));
      };

      const disposeSetLang = host.commands.add("subtitles:setLang", (lang: unknown) => {
        const tracks = getTracks();
        tracks.forEach((t) => {
          t.mode = t.language === (lang as string) ? "showing" : "hidden";
        });
        emitChanged();
      });

      const disposeOff = host.commands.add("subtitles:off", () => {
        getTracks().forEach((t) => {
          t.mode = "hidden";
        });
        emitChanged();
      });

      // Apply defaults when a video element is available.
      const tryInit = (): void => {
        const el = document.querySelector<HTMLVideoElement>("video[data-f8-player-video]");
        if (el) {
          videoEl = el;
          applyDefault();
        }
      };

      // Retry after a short delay to wait for React to render the <video>.
      const timeoutId = setTimeout(tryInit, 50);

      return () => {
        clearTimeout(timeoutId);
        disposeSetLang();
        disposeOff();
      };
    },
  };
}
