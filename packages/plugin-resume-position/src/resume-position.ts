import type { Player, PluginHost, PluginInstance } from "@f8/player-core";
import type { SourceDescriptor } from "@f8/player-core";

export interface ResumePositionStorage {
  get(key: string): number | undefined;
  set(key: string, seconds: number): void;
  delete(key: string): void;
}

export interface ResumePositionPluginOptions {
  /**
   * Storage backend. Defaults to a `localStorage`-backed implementation.
   * Pass a custom object to use sessionStorage, IndexedDB, or an in-memory
   * map. SSR (no `window`) skips storage entirely and the plugin is a no-op.
   */
  storage?: ResumePositionStorage;
  /**
   * Namespace prefix for localStorage keys. Defaults to `"f8-player:resume:"`.
   */
  storagePrefix?: string;
  /**
   * Minimum seconds to consider worth resuming. Defaults to `3`.
   * Positions below this (e.g. position 0 or near-beginning) are not saved.
   */
  minSeconds?: number;
  /**
   * Seconds before the end at which to clear the saved position (treat as
   * "finished"). Defaults to `5`.
   */
  endThreshold?: number;
  /**
   * How often (in ms) to save the position while playback is running.
   * Defaults to `10_000` (10s). Pass `0` to disable periodic saves and
   * only persist on pause / pagehide / visibilitychange (the previous
   * behavior).
   *
   * Periodic saves protect against tab crashes and forced reloads where
   * `pagehide` is unreliable (A8).
   */
  saveIntervalMs?: number;
  /**
   * Compute the storage key from the source descriptor.
   *
   * Defaults to `source.src` — which fails when the URL carries a signed
   * token that changes every request (S3 presigned URLs, time-limited
   * CDN links). Pass a stable function returning e.g. `"course:42:lesson:7"`
   * to fix that case (C4).
   *
   * Returning `null` means "do not persist for this source".
   */
  keyFn?: (source: SourceDescriptor) => string | null;
}

const PLUGIN_NAME = "resume-position";

function makeLocalStorage(prefix: string): ResumePositionStorage {
  return {
    get(key): number | undefined {
      try {
        const val = localStorage.getItem(prefix + key);
        if (val === null) return undefined;
        const n = Number(val);
        return Number.isFinite(n) ? n : undefined;
      } catch {
        return undefined;
      }
    },
    set(key, seconds): void {
      try {
        localStorage.setItem(prefix + key, String(seconds));
      } catch {
        // Quota exceeded — silently ignore.
      }
    },
    delete(key): void {
      try {
        localStorage.removeItem(prefix + key);
      } catch {
        // ignore
      }
    },
  };
}

/**
 * Resume-position plugin.
 *
 * Saves the playback position to storage so the user can pick up where they
 * left off across page reloads. Save points:
 *
 *   1. When the player **pauses** (intent signal).
 *   2. On **pagehide** / **visibilitychange→hidden** — fires on iOS Safari
 *      tab swipe-away where `beforeunload` does NOT fire (A8).
 *   3. On **beforeunload** — desktop browsers and Android Chrome.
 *   4. **Periodically** every `saveIntervalMs` while playing — protects
 *      against forced page kills, OS-level tab discard, and battery
 *      shutdown.
 *
 * On source attach, if the engine is already `ready` (or transitions to
 * ready), the plugin seeks to the saved position. Mounting the plugin
 * AFTER ready also works (A9).
 *
 * SSR-safe: if `window` is undefined the plugin returns a no-op teardown.
 */
export function createResumePositionPlugin(
  options: ResumePositionPluginOptions = {},
): PluginInstance {
  const {
    storage,
    storagePrefix = "f8-player:resume:",
    minSeconds = 3,
    endThreshold = 5,
    saveIntervalMs = 10_000,
    keyFn,
  } = options;

  return {
    name: PLUGIN_NAME,

    setup(player: Player, _host: PluginHost): () => void {
      // SSR guard — Next.js / Remix prerender must not crash on
      // `window.addEventListener` (A8).
      if (typeof window === "undefined") return () => undefined;

      const store = storage ?? makeLocalStorage(storagePrefix);

      const getKey = (): string | null => {
        const src = player.getSource();
        if (!src) return null;
        if (keyFn) return keyFn(src);
        return src.src;
      };

      const savePosition = (): void => {
        const key = getKey();
        if (!key) return;
        const { currentTime, duration } = player.getState();
        if (currentTime < minSeconds) {
          store.delete(key);
          return;
        }
        if (duration > 0 && currentTime >= duration - endThreshold) {
          store.delete(key);
          return;
        }
        store.set(key, currentTime);
      };

      const seekToSavedIfAny = (): void => {
        const key = getKey();
        if (!key) return;
        const saved = store.get(key);
        if (saved !== undefined && saved >= minSeconds) {
          player.seekTo(saved);
        }
      };

      // A9 — if the plugin is registered after the player is already ready
      // (lazy plugin load, route remount with a singleton player), `on("ready")`
      // never fires. Seek immediately in that case.
      const currentStatus = player.getState().status;
      if (
        currentStatus === "ready" ||
        currentStatus === "playing" ||
        currentStatus === "paused" ||
        currentStatus === "ended"
      ) {
        seekToSavedIfAny();
      }

      const offReady = player.on("ready", () => {
        seekToSavedIfAny();
      });

      const offPause = player.on("pause", savePosition);
      const offEnded = player.on("ended", () => {
        const key = getKey();
        if (key) store.delete(key);
      });

      // Periodic save while playing. Resets on pause/play transitions so
      // a paused tab does not write needlessly.
      let intervalId: ReturnType<typeof setInterval> | null = null;
      const startInterval = (): void => {
        if (saveIntervalMs <= 0 || intervalId !== null) return;
        intervalId = setInterval(savePosition, saveIntervalMs);
      };
      const stopInterval = (): void => {
        if (intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
      };
      const offPlay = player.on("play", startInterval);
      const offPauseInterval = player.on("pause", stopInterval);
      const offEndedInterval = player.on("ended", stopInterval);

      // If we mounted while already playing, start the interval immediately.
      if (currentStatus === "playing") startInterval();

      // Cover every reliable "leaving the page" signal. iOS Safari does NOT
      // fire `beforeunload` when the user swipes away the tab, but DOES fire
      // `pagehide` and `visibilitychange→hidden` (A8).
      const handleUnload = (): void => savePosition();
      const handleVisibility = (): void => {
        if (typeof document !== "undefined" && document.visibilityState === "hidden") {
          savePosition();
        }
      };
      window.addEventListener("beforeunload", handleUnload);
      window.addEventListener("pagehide", handleUnload);
      if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", handleVisibility);
      }

      return () => {
        offReady();
        offPause();
        offEnded();
        offPlay();
        offPauseInterval();
        offEndedInterval();
        stopInterval();
        window.removeEventListener("beforeunload", handleUnload);
        window.removeEventListener("pagehide", handleUnload);
        if (typeof document !== "undefined") {
          document.removeEventListener("visibilitychange", handleVisibility);
        }
      };
    },
  };
}
