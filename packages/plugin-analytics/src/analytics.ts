import type { Player, PluginHost, PluginInstance } from "@f8/player-core";

export interface AnalyticsEvent {
  type: "play" | "pause" | "ended" | "progress" | "seek" | "error";
  currentTime: number;
  duration: number;
  /** Progress event only: percentage 0–100. */
  percent?: number;
}

export interface AnalyticsPluginOptions {
  /**
   * Sink function that receives every analytics event.
   * Runs synchronously — keep it lightweight or defer to async yourself.
   */
  onEvent: (event: AnalyticsEvent) => void;
  /**
   * Interval in seconds for emitting `progress` events. Defaults to 10.
   * Set to `0` to disable progress events.
   */
  progressInterval?: number;
}

const PLUGIN_NAME = "analytics";

/**
 * Analytics plugin — reports play, pause, ended, progress, seek, and error
 * events through a single `onEvent` sink.
 *
 * Golden cases: G1 (course watch-time tracking), G2 (story engagement).
 */
export function createAnalyticsPlugin(options: AnalyticsPluginOptions): PluginInstance {
  const { onEvent, progressInterval = 10 } = options;

  return {
    name: PLUGIN_NAME,

    setup(player: Player, _host: PluginHost): () => void {
      let lastProgressReport = 0;
      let lastReportedTime = 0;

      const snap = (): { currentTime: number; duration: number } => {
        const s = player.getState();
        return { currentTime: s.currentTime, duration: s.duration };
      };

      const offPlay = player.on("play", () => {
        const { currentTime, duration } = snap();
        onEvent({ type: "play", currentTime, duration });
        lastProgressReport = currentTime;
      });

      const offPause = player.on("pause", () => {
        const { currentTime, duration } = snap();
        onEvent({ type: "pause", currentTime, duration });
      });

      const offEnded = player.on("ended", () => {
        const { currentTime, duration } = snap();
        onEvent({ type: "ended", currentTime, duration, percent: 100 });
      });

      const offError = player.on("error", () => {
        const { currentTime, duration } = snap();
        onEvent({ type: "error", currentTime, duration });
      });

      const offSeeked = player.on("seeked", (e) => {
        onEvent({ type: "seek", currentTime: e.time, duration: snap().duration });
      });

      let offTimeUpdate: (() => void) | null = null;

      if (progressInterval > 0) {
        offTimeUpdate = player.on("timeupdate", (e) => {
          const { duration } = snap();
          if (e.currentTime - lastProgressReport >= progressInterval) {
            lastProgressReport = e.currentTime;
            lastReportedTime = e.currentTime;
            const percent = duration > 0 ? Math.round((e.currentTime / duration) * 100) : 0;
            onEvent({ type: "progress", currentTime: e.currentTime, duration, percent });
          }
        });
      }
      void lastReportedTime; // suppress unused warning

      return () => {
        offPlay();
        offPause();
        offEnded();
        offError();
        offSeeked();
        offTimeUpdate?.();
      };
    },
  };
}
