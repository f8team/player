import type { Player, PluginHost, PluginInstance } from "@f8/player-core";

export interface StoryGesturesPluginOptions {
  /**
   * Callback invoked when the user taps the left zone (prev story).
   */
  onPrev?: () => void;
  /**
   * Callback invoked when the user taps the right zone (next story).
   */
  onNext?: () => void;
  /**
   * Callback invoked when the user hold-pauses the story.
   */
  onHold?: (type: "start" | "end") => void;
  /**
   * Element to attach gestures to. Defaults to `[data-f8-player]`.
   */
  getContainer?: () => Element | null;
  /**
   * Hold duration in ms. Defaults to 300.
   */
  holdDuration?: number;
  /**
   * Zone ratio (0..1). Defaults to 0.35.
   */
  zoneRatio?: number;
}

const PLUGIN_NAME = "story-gestures";

/**
 * Story gestures plugin — story-specific tap/hold/swipe pattern.
 *
 * | Gesture       | Action                          |
 * |---------------|---------------------------------|
 * | Tap left zone | `onPrev()` (prev story)         |
 * | Tap right zone| `onNext()` (next story)         |
 * | Tap center    | Play/Pause toggle               |
 * | Hold (center) | Pause + `onHold("start")`       |
 * | Release hold  | Play  + `onHold("end")`         |
 *
 * Different from `touch-gestures`: no seek on tap, story nav instead.
 *
 * Golden case: G2 (story-format learning, full-bleed mobile video).
 */
export function createStoryGesturesPlugin(
  options: StoryGesturesPluginOptions = {},
): PluginInstance {
  const {
    onPrev,
    onNext,
    onHold,
    getContainer,
    holdDuration = 300,
    zoneRatio = 0.35,
  } = options;

  return {
    name: PLUGIN_NAME,

    setup(player: Player, host: PluginHost): () => void {
      const getEl = (): Element | null => {
        if (getContainer) return getContainer();
        return (
          document.querySelector("[data-f8-player]") ??
          document.querySelector("video[data-f8-player-video]") ??
          null
        );
      };

      let holdTimer: ReturnType<typeof setTimeout> | null = null;
      let didHold = false;
      let tapTimer: ReturnType<typeof setTimeout> | null = null;
      let tapCount = 0;
      let lastTapX = 0;

      const getZone = (x: number): "left" | "center" | "right" => {
        const el = getEl();
        if (!el) return "center";
        const { left, width } = el.getBoundingClientRect();
        const rel = (x - left) / width;
        if (rel < zoneRatio) return "left";
        if (rel > 1 - zoneRatio) return "right";
        return "center";
      };

      const handleTap = (x: number): void => {
        const zone = getZone(x);
        if (zone === "left") {
          onPrev?.();
          host.emit("story-gestures:prev", undefined);
        } else if (zone === "right") {
          onNext?.();
          host.emit("story-gestures:next", undefined);
        } else {
          if (player.getState().status === "playing") {
            player.pause();
          } else {
            player.play().catch(() => undefined);
          }
        }
      };

      const onTouchStart = (e: TouchEvent): void => {
        didHold = false;
        const x = e.touches[0]?.clientX ?? 0;
        lastTapX = x;

        holdTimer = setTimeout(() => {
          holdTimer = null;
          didHold = true;
          player.pause();
          onHold?.("start");
          host.emit("story-gestures:hold", { type: "start" });
        }, holdDuration);
      };

      const onTouchEnd = (): void => {
        if (holdTimer !== null) {
          clearTimeout(holdTimer);
          holdTimer = null;
        }

        if (didHold) {
          didHold = false;
          player.play().catch(() => undefined);
          onHold?.("end");
          host.emit("story-gestures:hold", { type: "end" });
          return;
        }

        tapCount += 1;
        if (tapCount === 1) {
          tapTimer = setTimeout(() => {
            tapCount = 0;
            tapTimer = null;
            handleTap(lastTapX);
          }, 200);
        } else if (tapCount >= 2) {
          if (tapTimer !== null) {
            clearTimeout(tapTimer);
            tapTimer = null;
          }
          tapCount = 0;
          host.emit("story-gestures:doubleTap", { x: lastTapX });
        }
      };

      const el = getEl();
      if (el) {
        (el as HTMLElement).addEventListener("touchstart", onTouchStart as EventListener, { passive: true });
        (el as HTMLElement).addEventListener("touchend", onTouchEnd as EventListener);
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
