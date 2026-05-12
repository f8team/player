import type { Player, PluginHost, PluginInstance } from "@f8/player-core";

export interface ResumePositionStorage {
  get(key: string): number | undefined;
  set(key: string, seconds: number): void;
  delete(key: string): void;
}

export interface ResumePositionPluginOptions {
  /**
   * Storage backend. Defaults to a `localStorage`-backed implementation.
   * Pass a custom object to use sessionStorage, IndexedDB, or an in-memory
   * map.
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
 * Saves the playback position to storage whenever the player pauses or the
 * page unloads. On source attach (ready), seeks to the saved position if
 * available.
 *
 * The storage key is the source URL (`source.src`).
 */
export function createResumePositionPlugin(
  options: ResumePositionPluginOptions = {},
): PluginInstance {
  const {
    storage,
    storagePrefix = "f8-player:resume:",
    minSeconds = 3,
    endThreshold = 5,
  } = options;

  return {
    name: PLUGIN_NAME,

    setup(player: Player, _host: PluginHost): () => void {
      const store = storage ?? makeLocalStorage(storagePrefix);

      const getKey = (): string | null => player.getSource()?.src ?? null;

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

      const offReady = player.on("ready", () => {
        const key = getKey();
        if (!key) return;
        const saved = store.get(key);
        if (saved !== undefined && saved >= minSeconds) {
          player.seekTo(saved);
        }
      });

      const offPause = player.on("pause", savePosition);
      const offEnded = player.on("ended", () => {
        const key = getKey();
        if (key) store.delete(key);
      });

      const handleUnload = (): void => savePosition();
      window.addEventListener("beforeunload", handleUnload);

      return () => {
        offReady();
        offPause();
        offEnded();
        window.removeEventListener("beforeunload", handleUnload);
      };
    },
  };
}
