import { formatTime } from "@f8/player-core";
import {
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { usePlayer } from "../../hooks/usePlayer.js";
import { usePlayerState } from "../../hooks/usePlayerState.js";
import { useLabels } from "../../i18n.js";

export type SeekBarProps = Omit<
  ComponentPropsWithoutRef<"input">,
  | "type"
  | "min"
  | "max"
  | "value"
  | "step"
  | "onChange"
  | "aria-valuenow"
  | "aria-valuemin"
  | "aria-valuemax"
> & {
  /** Override the inline width of the buffered overlay; rarely needed. */
  bufferedClassName?: string;
};

/**
 * `<Player.Controls.SeekBar>` — a range input that reflects and controls the
 * current playback position.
 *
 * The render output is now a small wrapper:
 *
 * ```html
 * <div data-f8p-seek-wrapper>
 *   <div data-f8p-seek-buffered style="width: 42%"></div>
 *   <input type="range" data-f8-player-control="seek-bar" />
 * </div>
 * ```
 *
 * The wrapper lets themes draw a buffered-progress bar behind the range
 * thumb (B4) without changing the JS contract. The buffered span uses the
 * largest end time in `state.buffered` so HLS sources get an honest
 * "loaded ahead" indicator.
 *
 * Drag commits are throttled (C2): while the user is actively dragging the
 * thumb (pointer down) we update visually without firing `seekTo` on every
 * pixel. The actual `seekTo` call fires on pointer-up — single network seek
 * instead of dozens.
 *
 * ARIA: `aria-label` reads `labels.seek`; `aria-valuetext` includes the
 * formatted time so screen readers announce "01:23 of 05:00" rather than
 * raw seconds.
 */
export function SeekBar({ bufferedClassName, style, ...props }: SeekBarProps): JSX.Element {
  const player = usePlayer();
  const labels = useLabels();
  const currentTime = usePlayerState((s) => s.currentTime);
  const duration = usePlayerState((s) => s.duration);
  const buffered = usePlayerState((s) => s.buffered);

  // While dragging we render `localValue` instead of the live store value so
  // the UI stays responsive; seekTo fires only on release (C2).
  const [dragValue, setDragValue] = useState<number | null>(null);
  const draggingRef = useRef(false);

  const max = duration > 0 && Number.isFinite(duration) ? duration : 1;
  const liveValue = Math.min(Math.max(currentTime, 0), max);
  const displayValue = Math.min(Math.max(dragValue ?? liveValue, 0), max);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      const v = Number(e.target.value);
      if (draggingRef.current) {
        setDragValue(v);
      } else {
        // Keyboard / single click bypasses the drag path — seek immediately.
        player.seekTo(v);
      }
    },
    [player],
  );

  const handlePointerDown = useCallback((_e: ReactPointerEvent<HTMLInputElement>): void => {
    draggingRef.current = true;
    setDragValue(null);
  }, []);

  const commitDrag = useCallback((): void => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragValue((v) => {
      if (v !== null) player.seekTo(v);
      return null;
    });
  }, [player]);

  // Listen on the window so we still commit when the pointer leaves the
  // input (drag-and-release outside the thumb).
  useEffect(() => {
    const onUp = (): void => commitDrag();
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [commitDrag]);

  // Buffered overlay: take the furthest end time across all ranges. The
  // wrapper is `position: relative`; the overlay is `position: absolute`
  // with a percentage width. Themes can style the .buffered class.
  const bufferedEnd = buffered.reduce((acc, r) => Math.max(acc, r.end), 0);
  const bufferedPct = max > 0 ? Math.min(100, (bufferedEnd / max) * 100) : 0;
  const playedPct = max > 0 ? Math.min(100, (displayValue / max) * 100) : 0;

  const wrapperStyle: CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    "--f8p-seek-progress": `${playedPct}%`,
    ...((style as CSSProperties) ?? {}),
  } as CSSProperties;
  const bufferedStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    top: "50%",
    transform: "translateY(-50%)",
    height: "0.4rem",
    width: `${bufferedPct}%`,
    pointerEvents: "none",
  };

  const formatted = formatTime(displayValue);
  const total = formatTime(max);

  return (
    <div data-f8p-seek-wrapper="" style={wrapperStyle}>
      <div
        data-f8p-seek-buffered=""
        className={bufferedClassName}
        style={bufferedStyle}
        aria-hidden="true"
      />
      <input
        {...props}
        type="range"
        min={0}
        max={max}
        step={0.1}
        value={displayValue}
        onChange={handleChange}
        onPointerDown={handlePointerDown}
        role="slider"
        aria-label={labels.seek}
        aria-valuenow={displayValue}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuetext={`${formatted} / ${total}`}
        data-f8-player-control="seek-bar"
        style={{ position: "relative", width: "100%", zIndex: 1 }}
      />
    </div>
  );
}
