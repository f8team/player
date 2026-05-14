import { formatTime } from "@f8team/reel-core";
import type { Disposer } from "@f8team/reel-core";
import {
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { usePlayer } from "../../hooks/usePlayer.js";
import { usePlayerState } from "../../hooks/usePlayerState.js";
import { useLabels } from "../../i18n.js";

/**
 * Shape of one parsed sprite-thumbnail cue. Mirrors the public type of
 * `@f8team/reel-plugin-thumbnails`. Kept structurally compatible so the
 * adapter does not need a peer dependency on the plugin package.
 */
interface ThumbnailCueLite {
  start: number;
  end: number;
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Pixel dimensions used when a cue has no explicit tile size. */
const THUMB_PREVIEW_WIDTH = 160;
const THUMB_PREVIEW_HEIGHT = 90;
const THUMB_PREVIEW_SCALE = 0.5;

function findCueAt(cues: readonly ThumbnailCueLite[], time: number): ThumbnailCueLite | null {
  if (!cues.length || !Number.isFinite(time)) return null;
  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const cue = cues[mid];
    if (!cue) return null;
    if (time < cue.start) {
      hi = mid - 1;
    } else if (time >= cue.end) {
      lo = mid + 1;
    } else {
      return cue;
    }
  }
  return null;
}

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
  /**
   * CSS class on `[data-reel-seek-wrapper]` — use for flex-grow, min-width, etc.
   * The native `<input type="range">` receives `className`.
   */
  wrapperClassName?: string;
  /** Inline styles merged onto the range input after player defaults (`width: 100%`, stacking context). */
  inputStyle?: CSSProperties;
  /** CSS class merged onto the hover thumbnail tooltip (`[data-reel-seek-thumbnail]`). */
  thumbnailClassName?: string;
};

/**
 * `<Player.Controls.SeekBar>` — a range input that reflects and controls the
 * current playback position.
 *
 * The render output is now a small wrapper:
 *
 * ```html
 * <div data-reel-seek-wrapper class="(wrapperClassName)">
 *   <div data-reel-seek-buffered style="width: 42%"></div>
 *   <input type="range" data-reel-control="seek-bar" class="(className)" />
 * </div>
 * ```
 *
 * Styling: put layout/flex on `wrapperClassName`; thumb/track styling stays on
 * the native range via `className`.
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
export function SeekBar({
  bufferedClassName,
  wrapperClassName,
  style,
  inputStyle,
  className,
  thumbnailClassName,
  ...props
}: SeekBarProps): JSX.Element {
  const player = usePlayer();
  const labels = useLabels();
  const currentTime = usePlayerState((s) => s.currentTime);
  const duration = usePlayerState((s) => s.duration);
  const buffered = usePlayerState((s) => s.buffered);

  // While dragging we render `localValue` instead of the live store value so
  // the UI stays responsive; seekTo fires only on release (C2).
  const [dragValue, setDragValue] = useState<number | null>(null);
  const draggingRef = useRef(false);

  // Sprite thumbnails — populated by `@f8team/reel-plugin-thumbnails` events
  // when present. Stays empty when the plugin isn't loaded.
  const [cues, setCues] = useState<readonly ThumbnailCueLite[]>([]);

  // Hover state for the thumbnail tooltip. `null` means "not hovering".
  const [hover, setHover] = useState<{
    x: number;
    time: number;
    hostWidth: number;
    wrapperLeft: number;
  } | null>(null);

  const wrapperRef = useRef<HTMLDivElement | null>(null);

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

  // Subscribe to `@f8team/reel-plugin-thumbnails` events. The plugin is
  // optional — if it isn't loaded, `player.on(...)` simply never fires and
  // `cues` stays `[]`, so the thumbnail tooltip never renders.
  useEffect(() => {
    type ThumbnailEvent =
      | { name: "thumbnails:ready"; payload: { cues: ThumbnailCueLite[] } }
      | { name: "thumbnails:cleared"; payload: undefined };
    const onAny = player.on as unknown as (
      event: ThumbnailEvent["name"],
      handler: (payload: unknown) => void,
    ) => Disposer;

    const disposers: Disposer[] = [
      onAny("thumbnails:ready", (payload) => {
        const next = (payload as { cues?: ThumbnailCueLite[] } | undefined)?.cues;
        if (Array.isArray(next)) setCues(next);
      }),
      onAny("thumbnails:cleared", () => setCues([])),
    ];
    return () => {
      for (const d of disposers) d();
    };
  }, [player]);

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>): void => {
      const wrapper = wrapperRef.current;
      if (!wrapper || max <= 0) return;
      const rect = wrapper.getBoundingClientRect();
      if (rect.width === 0) return;
      const host = wrapper.closest<HTMLElement>("[data-reel]");
      const hostRect = host?.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const rawTime = (x / rect.width) * max;
      const time = Math.min(rawTime, Math.max(0, max - 0.001));
      setHover({
        x,
        time,
        hostWidth: hostRect && hostRect.width > 0 ? hostRect.width : rect.width,
        wrapperLeft: hostRect ? rect.left - hostRect.left : 0,
      });
    },
    [max],
  );

  const handlePointerLeave = useCallback((): void => {
    setHover(null);
  }, []);

  const hoverCue = useMemo(
    () => (hover && cues.length > 0 ? findCueAt(cues, hover.time) : null),
    [hover, cues],
  );

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
    "--reel-seek-progress": `${playedPct}%`,
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

  const mergedInputStyle = {
    position: "relative" as const,
    width: "100%",
    zIndex: 1,
    ...(inputStyle as CSSProperties | undefined),
  };

  // Thumbnail tooltip — only mounted when the plugin has cues AND a cue is
  // active at the current hover position. Tile size falls back to the
  // configured preview width/height when the cue's `w/h` are 0 (cue body
  // had no `#xywh=` fragment).
  const thumbnailTile = (() => {
    if (!hover || !hoverCue) return null;
    const tileW = hoverCue.w > 0 ? hoverCue.w : THUMB_PREVIEW_WIDTH;
    const tileH = hoverCue.h > 0 ? hoverCue.h : THUMB_PREVIEW_HEIGHT;
    const renderW = tileW * THUMB_PREVIEW_SCALE;
    const renderH = tileH * THUMB_PREVIEW_SCALE;
    const edgePadding = 8;
    const hostLeftInWrapper = -hover.wrapperLeft;
    const hostRightInWrapper = hover.hostWidth - hover.wrapperLeft;
    const minCenter = hostLeftInWrapper + renderW / 2 + edgePadding;
    const maxCenter = hostRightInWrapper - renderW / 2 - edgePadding;
    const center =
      minCenter <= maxCenter
        ? Math.min(maxCenter, Math.max(minCenter, hover.x))
        : (hostLeftInWrapper + hostRightInWrapper) / 2;
    const tileStyle: CSSProperties = {
      position: "absolute",
      bottom: "calc(100% + 0.8rem)",
      left: center - renderW / 2,
      width: renderW,
      height: renderH,
      pointerEvents: "none",
      zIndex: 2,
    };
    const imageStyle: CSSProperties = {
      width: tileW,
      height: tileH,
      transform: `scale(${THUMB_PREVIEW_SCALE})`,
      transformOrigin: "0 0",
      backgroundImage: `url("${hoverCue.src}")`,
      backgroundRepeat: "no-repeat",
      backgroundPosition: `-${hoverCue.x}px -${hoverCue.y}px`,
    };
    const labelStyle: CSSProperties = {
      position: "absolute",
      left: center,
      bottom: "calc(100% + 0.2rem)",
      transform: "translateX(-50%)",
      color: "#fff",
      fontSize: "1.2rem",
      fontVariantNumeric: "tabular-nums",
      textShadow: "0 1px 0.2rem rgba(0,0,0,0.55)",
      whiteSpace: "nowrap",
      pointerEvents: "none",
      zIndex: 2,
    };
    return (
      <>
        <div
          data-reel-seek-thumbnail=""
          className={thumbnailClassName}
          style={tileStyle}
          aria-hidden="true"
        >
          <div data-reel-seek-thumbnail-image="" style={imageStyle} />
        </div>
        <span data-reel-seek-thumbnail-time="" style={labelStyle} aria-hidden="true">
          {formatTime(hover.time)}
        </span>
      </>
    );
  })();

  return (
    <div
      data-reel-seek-wrapper=""
      className={wrapperClassName}
      style={wrapperStyle}
      ref={wrapperRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div
        data-reel-seek-buffered=""
        className={bufferedClassName}
        style={bufferedStyle}
        aria-hidden="true"
      />
      {thumbnailTile}
      <input
        {...props}
        className={className}
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
        data-reel-control="seek-bar"
        style={mergedInputStyle}
      />
    </div>
  );
}
