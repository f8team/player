import type { Player, PluginHost, PluginInstance } from "@f8/player-core";

export interface Marker {
  /** Time in seconds. */
  time: number;
  /** Display label (chapter title, transcript segment, etc.). */
  label: string;
  /** Optional extra payload forwarded to `markers:click` event. */
  data?: unknown;
}

export interface MarkersPluginOptions {
  /** Initial set of markers. Can be changed via `markers:setMarkers` command. */
  markers?: Marker[];
}

const PLUGIN_NAME = "markers";

/**
 * Markers plugin — chapters / transcript points.
 *
 * Commands:
 * - `markers:setMarkers` — replace the entire marker set.
 * - `markers:seekTo` — seek to a marker by index or time (seconds).
 *
 * Events:
 * - `markers:changed` — emitted when markers change.
 * - `markers:click` — emitted when `markers:seekTo` is called (for UI
 *   highlighting).
 *
 * Golden cases: G8 (transcript), G9 (chapter list, click-to-seek).
 */
export function createMarkersPlugin(options: MarkersPluginOptions = {}): PluginInstance {
  let markers: Marker[] = [...(options.markers ?? [])];

  return {
    name: PLUGIN_NAME,

    setup(player: Player, host: PluginHost): () => void {
      const disposeSet = host.commands.add("markers:setMarkers", (newMarkers: unknown) => {
        markers = [...(newMarkers as Marker[])];
        host.emit("markers:changed", markers);
      });

      const disposeSeek = host.commands.add("markers:seekTo", (indexOrTime: unknown) => {
        let marker: Marker | undefined;

        if (typeof indexOrTime === "number") {
          // Check if it could be an index (integer, < markers.length) or a time.
          if (Number.isInteger(indexOrTime) && indexOrTime >= 0 && indexOrTime < markers.length) {
            marker = markers[indexOrTime];
          } else {
            // Treat as a time value — find nearest marker.
            marker = markers.reduce<Marker | undefined>((closest, m) => {
              if (!closest) return m;
              return Math.abs(m.time - indexOrTime) < Math.abs(closest.time - indexOrTime)
                ? m
                : closest;
            }, undefined);
          }
        }

        if (marker) {
          player.seekTo(marker.time);
          host.emit("markers:click", marker);
        }
      });

      // Emit initial markers.
      if (markers.length > 0) {
        host.emit("markers:changed", markers);
      }

      return () => {
        disposeSet();
        disposeSeek();
      };
    },
  };
}
