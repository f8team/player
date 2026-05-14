import type { Player, PluginHost, PluginInstance, QualityLevel } from "@f8team/reel-core";

/** Persisted user preferences stored in `localStorage`. */
export interface PlayerPrefs {
  volume?: number;
  muted?: boolean;
  playbackRate?: number;
  /** Quality resolution in pixels (e.g. 720, 1080). null = auto. */
  qualityHeight?: number | null;
  /** Active captions language code. null = off. */
  captionsLang?: string | null;
}

export interface PrefsPluginOptions {
  /**
   * `localStorage` key. Default `"reel-player:prefs"`. Override when embedding
   * multiple players on the same page so their prefs don't bleed
   * (e.g. `"reel-player:prefs:lesson"`, `"reel-player:prefs:preview"`).
   */
  storageKey?: string;
  /** Skip persisting volume changes. Default `false`. */
  lockVolume?: boolean;
  /** Skip persisting muted changes. Default `false`. */
  lockMuted?: boolean;
  /** Skip persisting playbackRate changes. Default `false`. */
  lockPlaybackRate?: boolean;
  /** Skip persisting selected quality height. Default `false`. */
  lockQualityHeight?: boolean;
  /**
   * Restore prefs on the `ready` event. Default `true`. Set `false` if the
   * consumer wants to seed initial values via `options` instead.
   */
  restoreOnReady?: boolean;
}

const DEFAULT_STORAGE_KEY = "reel-player:prefs";
const PLUGIN_NAME = "prefs";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readPrefs(key: string): PlayerPrefs {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as PlayerPrefs) : {};
  } catch {
    return {};
  }
}

function writePrefs(key: string, patch: Partial<PlayerPrefs>): void {
  if (!isBrowser()) return;
  try {
    const prev = readPrefs(key);
    const next = { ...prev, ...patch };
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Quota / private mode / disabled storage — fail silently. The plugin
    // contract is best-effort persistence, never throw.
  }
}

/**
 * Persist user prefs (volume, muted, playbackRate, qualityHeight, captionsLang)
 * to `localStorage` and restore them on `ready`.
 *
 * Replaces the boilerplate `PersistPrefs` component each consumer (f8-ui,
 * f8-dash-ui, f8-pro-ui) used to write.
 *
 * Behavior:
 * - **SSR-safe.** No-op when `window`/`localStorage` is unavailable.
 * - **Autoplay-muted bootstrap.** Browser muted-autoplay emits a synthetic
 *   `volumechange { muted: true, volume: 1 }` before the first real play.
 *   Saving immediately would overwrite the user's preferred volume; the plugin
 *   defers volume save until after the first real `play` event.
 * - **Multi-player isolation** via `storageKey` override.
 * - **Best-effort.** All `localStorage` errors are swallowed.
 *
 * @phase-3-target T3.2
 */
export function createPrefsPlugin(options: PrefsPluginOptions = {}): PluginInstance {
  const {
    storageKey = DEFAULT_STORAGE_KEY,
    lockVolume = false,
    lockMuted = false,
    lockPlaybackRate = false,
    lockQualityHeight = false,
    restoreOnReady = true,
  } = options;

  return {
    name: PLUGIN_NAME,

    setup(player: Player, host: PluginHost): () => void {
      // SSR guard — return early so consumers can attach the plugin in any
      // environment without conditional wiring.
      if (!isBrowser()) {
        return () => undefined;
      }

      // Defer volume persistence until after the first user-real play event.
      // See lifecycle in JSDoc above.
      let allowVolumeSave = false;
      let needPostAutoplayRestore = true;

      let qualitySubscriberDispose: (() => void) | null = null;

      const applyQualityFromPrefs = (qualityHeight: number | null): boolean => {
        if (qualityHeight === null) {
          // Explicit "auto" — let the engine pick.
          return true;
        }
        const state = player.getState();
        const matched = state.qualities.find((q) => q.height === qualityHeight);
        if (matched) {
          host.commands.run("hls:setQuality", matched as unknown as Record<string, unknown>);
          return true;
        }
        return false;
      };

      const restore = (): void => {
        const prefs = readPrefs(storageKey);
        if (!lockVolume && typeof prefs.volume === "number") {
          player.setVolume(prefs.volume);
        }
        if (!lockMuted && typeof prefs.muted === "boolean") {
          player.setMuted(prefs.muted);
        }
        if (!lockPlaybackRate && typeof prefs.playbackRate === "number") {
          player.setPlaybackRate(prefs.playbackRate);
        }

        if (lockQualityHeight || prefs.qualityHeight === undefined) return;

        const qh = prefs.qualityHeight;
        if (applyQualityFromPrefs(qh)) {
          qualitySubscriberDispose?.();
          qualitySubscriberDispose = null;
          return;
        }

        // Quality not in current list — wait for it to appear. Levels are
        // loaded asynchronously by hls.js MANIFEST_PARSED.
        qualitySubscriberDispose?.();
        qualitySubscriberDispose = player.subscribe<readonly QualityLevel[]>(
          (s) => s.qualities,
          () => {
            if (applyQualityFromPrefs(qh)) {
              qualitySubscriberDispose?.();
              qualitySubscriberDispose = null;
            }
          },
        );
      };

      // Initial restore. Some consumers attach the plugin AFTER `ready` already
      // fired; reading current LS values immediately covers that case.
      if (restoreOnReady) {
        restore();
      }

      const offReady = player.on("ready", () => {
        // Reset autoplay guard on every new source so the second video in a
        // playlist also defers volume save until first real play.
        allowVolumeSave = false;
        needPostAutoplayRestore = true;
        if (restoreOnReady) restore();
      });

      const offPlay = player.on("play", () => {
        if (needPostAutoplayRestore) {
          // First real play → re-apply prefs (covers cases where the engine
          // overrode them between `ready` and `play`).
          needPostAutoplayRestore = false;
          if (restoreOnReady) restore();
        }
        // Allow saves on the next tick to skip the synthetic volumechange that
        // can fire as part of the same play event.
        queueMicrotask(() => {
          allowVolumeSave = true;
        });
      });

      const offVolumeChange = player.on("volumechange", ({ volume, muted }) => {
        if (!allowVolumeSave) return;
        const patch: Partial<PlayerPrefs> = {};
        if (!lockVolume) patch.volume = volume;
        if (!lockMuted) patch.muted = muted;
        if (Object.keys(patch).length > 0) writePrefs(storageKey, patch);
      });

      const offRateChange = player.on("ratechange", ({ playbackRate }) => {
        if (lockPlaybackRate) return;
        writePrefs(storageKey, { playbackRate });
      });

      const offQualityChange = player.on("qualitychange", ({ quality, auto }) => {
        if (lockQualityHeight) return;
        // ABR-driven changes (auto = true) are NOT user prefs.
        if (auto) return;
        writePrefs(storageKey, { qualityHeight: quality?.height ?? null });
      });

      return () => {
        offReady();
        offPlay();
        offVolumeChange();
        offRateChange();
        offQualityChange();
        qualitySubscriberDispose?.();
        qualitySubscriberDispose = null;
      };
    },
  };
}
