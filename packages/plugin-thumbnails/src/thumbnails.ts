import type { Player, PluginHost, PluginInstance, SourceDescriptor } from "@f8team/reel-core";

import { parseSpriteVtt } from "./parseSpriteVtt.js";
import type { ThumbnailCue, ThumbnailsPluginOptions } from "./types.js";

const PLUGIN_NAME = "thumbnails";

/**
 * Sprite thumbnails plugin.
 *
 * When the active source descriptor includes a `thumbnails: { src }` entry,
 * the plugin fetches the VTT, parses the cues, and emits:
 *
 * - `thumbnails:ready` with `{ cues: ThumbnailCue[] }` once parsed.
 * - `thumbnails:cleared` when no thumbnails source is active.
 *
 * UI consumers (`Controls.SeekBar` in React, the Lit default chrome) subscribe
 * to those events and keep their own snapshot of cues so hover lookup stays
 * synchronous.
 *
 * The plugin also registers two convenience commands that mirror the events
 * for advanced consumers:
 *
 * - `thumbnails:reload` — re-fetch the current `source.thumbnails` (e.g.
 *   after a network blip).
 * - `thumbnails:clear` — drop cues without changing the source descriptor
 *   (useful for tests).
 */
export function createThumbnailsPlugin(_opts: ThumbnailsPluginOptions = {}): PluginInstance {
  return {
    name: PLUGIN_NAME,

    setup(player: Player, host: PluginHost): () => void {
      let abortCtrl: AbortController | null = null;
      let activeKey: string | null = null;
      let activeCues: readonly ThumbnailCue[] = [];

      const sourceKey = (src: SourceDescriptor | null | undefined): string | null => {
        const t = src?.thumbnails;
        if (!t?.src) return null;
        return `${t.src}::${t.withCredentials ? "1" : "0"}`;
      };

      const clearCues = (): void => {
        if (abortCtrl) {
          abortCtrl.abort();
          abortCtrl = null;
        }
        if (activeCues.length || activeKey) {
          activeCues = [];
          activeKey = null;
          host.emit("thumbnails:cleared", undefined);
        }
      };

      const loadFor = (descriptor: SourceDescriptor | null | undefined): void => {
        const t = descriptor?.thumbnails;
        const nextKey = sourceKey(descriptor);

        if (!t || !nextKey) {
          clearCues();
          return;
        }

        if (nextKey === activeKey) return;

        // Switch in flight — abort previous fetch.
        if (abortCtrl) abortCtrl.abort();
        const ctrl = new AbortController();
        abortCtrl = ctrl;
        activeKey = nextKey;
        activeCues = [];

        const init: RequestInit = { signal: ctrl.signal };
        if (t.withCredentials) init.credentials = "include";

        fetch(t.src, init)
          .then((res) => {
            if (!res.ok) throw new Error(`thumbnails: HTTP ${res.status}`);
            return res.text();
          })
          .then((text) => {
            // Source may have changed while we were fetching.
            if (ctrl.signal.aborted || activeKey !== nextKey) return;
            const cues = parseSpriteVtt(text, t.src);
            activeCues = cues;
            host.emit("thumbnails:ready", { cues });
          })
          .catch(() => {
            // AbortError or network failure — leave cues empty. The next
            // source change (or a `thumbnails:reload`) will retry.
            if (activeKey === nextKey) {
              activeKey = null;
              activeCues = [];
              host.emit("thumbnails:cleared", undefined);
            }
          });
      };

      // React to source changes via the readable store. The store fires the
      // listener only when the selector slice changes (===).
      const unsubscribe = host.store.subscribe(
        (state) => state.source,
        (source) => {
          loadFor(source);
        },
      );

      // Initial load (in case the source was set before subscription).
      loadFor(host.store.getState().source);

      const disposeReload = host.commands.add("thumbnails:reload", () => {
        const current = host.store.getState().source;
        // Force a reload by clearing the activeKey first.
        activeKey = null;
        loadFor(current);
      });

      const disposeClear = host.commands.add("thumbnails:clear", () => {
        clearCues();
      });

      // Free the unused `player` parameter so noUnusedParameters stays happy
      // without changing the public signature.
      void player;

      return () => {
        unsubscribe();
        disposeReload();
        disposeClear();
        if (abortCtrl) abortCtrl.abort();
        abortCtrl = null;
        activeKey = null;
        activeCues = [];
      };
    },
  };
}
