import type { Player, PluginHost, PluginInstance } from "@f8team/reel-core";

export interface TouchGesturesPluginOptions {
  /** Seek step for left/right tap zone (seconds). Defaults to 10. */
  seekStep?: number;
  /** Hold duration to trigger pause (ms). Defaults to 500. */
  holdDuration?: number;
  /** Zone ratio: portion of width considered left/right zone. Defaults to 0.3. */
  zoneRatio?: number;
  /** Element to attach gestures to. Defaults to `[data-reel]` or `<video>`. */
  getContainer?: () => Element | null;
}

const PLUGIN_NAME = "touch-gestures";

/**
 * Touch gestures plugin.
 *
 * | Gesture                 | Action                                           |
 * |-------------------------|--------------------------------------------------|
 * | Single tap — left zone  | Seek back `seekStep` s                           |
 * | Single tap — right zone | Seek forward `seekStep` s                        |
 * | Single tap — center     | Play / Pause toggle                              |
 * | Double-tap — left zone  | Seek back `seekStep * 2` s                       |
 * | Double-tap — right zone | Seek forward `seekStep * 2` s                    |
 * | Hold                    | Pause (release: play)                            |
 *
 * Emits `touch-gestures:seek`, `touch-gestures:doubleTap`, `touch-gestures:hold`.
 *
 * Golden case: G2 (mobile learning story / video tap controls).
 */
export function createTouchGesturesPlugin(
  options: TouchGesturesPluginOptions = {},
): PluginInstance {
  const { seekStep = 10, holdDuration = 500, zoneRatio = 0.3, getContainer } = options;

  return {
    name: PLUGIN_NAME,

    setup(player: Player, host: PluginHost): () => void {
      const getEl = (): Element | null => {
        if (getContainer) return getContainer();
        return (
          document.querySelector("[data-reel]") ??
          document.querySelector("video[data-reel-video]") ??
          null
        );
      };

      let tapTimer: ReturnType<typeof setTimeout> | null = null;
      let holdTimer: ReturnType<typeof setTimeout> | null = null;
      let tapCount = 0;
      let lastTapX = 0;

      const getZone = (x: number): "left" | "center" | "right" => {
        const el = getEl();
        if (!el) return "center";
        const rect = el.getBoundingClientRect();
        const rel = (x - rect.left) / rect.width;
        if (rel < zoneRatio) return "left";
        if (rel > 1 - zoneRatio) return "right";
        return "center";
      };

      const handleTap = (x: number): void => {
        const zone = getZone(x);
        if (zone === "left") {
          player.seekTo(Math.max(0, player.getState().currentTime - seekStep));
          host.emit("touch-gestures:seek", { direction: "back", seconds: seekStep });
        } else if (zone === "right") {
          player.seekTo(
            Math.min(player.getState().duration, player.getState().currentTime + seekStep),
          );
          host.emit("touch-gestures:seek", { direction: "forward", seconds: seekStep });
        } else {
          const state = player.getState();
          if (state.status === "playing") {
            player.pause();
          } else {
            player.play().catch(() => undefined);
          }
        }
      };

      const handleDoubleTap = (x: number): void => {
        const zone = getZone(x);
        const step = seekStep * 2;
        if (zone === "left") {
          player.seekTo(Math.max(0, player.getState().currentTime - step));
          host.emit("touch-gestures:doubleTap", { direction: "back", seconds: step });
        } else if (zone === "right") {
          player.seekTo(Math.min(player.getState().duration, player.getState().currentTime + step));
          host.emit("touch-gestures:doubleTap", { direction: "forward", seconds: step });
        }
      };

      const onTouchStart = (e: TouchEvent): void => {
        const x = e.touches[0]?.clientX ?? 0;
        lastTapX = x;

        holdTimer = setTimeout(() => {
          holdTimer = null;
          if (player.getState().status === "playing") {
            player.pause();
            host.emit("touch-gestures:hold", { type: "pause" });
          }
        }, holdDuration);
      };

      const onTouchEnd = (e: TouchEvent): void => {
        if (holdTimer !== null) {
          clearTimeout(holdTimer);
          holdTimer = null;
        } else {
          // Hold was consumed — skip tap logic.
          return;
        }

        // YouTube-style center overlay owns play/pause on the middle zone; skip
        // so the overlay's follow-up click does not double-toggle. Left/right
        // zones still seek via this handler.
        const target = e.target as Element | null;
        if (target?.closest?.("[data-reel-center-tap]")) {
          const x = e.changedTouches[0]?.clientX ?? lastTapX;
          if (getZone(x) === "center") {
            return;
          }
        }

        e.preventDefault();
        tapCount += 1;

        if (tapCount === 1) {
          tapTimer = setTimeout(() => {
            tapCount = 0;
            tapTimer = null;
            handleTap(lastTapX);
          }, 250);
        } else if (tapCount === 2) {
          if (tapTimer !== null) {
            clearTimeout(tapTimer);
            tapTimer = null;
          }
          tapCount = 0;
          handleDoubleTap(lastTapX);
        }
      };

      const el = getEl();
      if (el) {
        (el as HTMLElement).addEventListener("touchstart", onTouchStart as EventListener, {
          passive: true,
        });
        (el as HTMLElement).addEventListener("touchend", onTouchEnd as EventListener, {
          passive: false,
        });
      }

      return () => {
        if (tapTimer !== null) clearTimeout(tapTimer);
        if (holdTimer !== null) clearTimeout(holdTimer);
        if (el) {
          (el as HTMLElement).removeEventListener("touchstart", onTouchStart as EventListener);
          (el as HTMLElement).removeEventListener("touchend", onTouchEnd as EventListener);
        }
      };
    },
  };
}
