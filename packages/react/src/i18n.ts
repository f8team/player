/**
 * i18n surface for `@f8/player-react` controls.
 *
 * The default labels are **English** so the package is publishable as an
 * OSS dependency without forcing a language on consumers. F8 apps opt into
 * Vietnamese via:
 *
 * ```tsx
 * import { vietnameseLabels } from "@f8/player-react";
 *
 * <Player.Root options={...} labels={vietnameseLabels}>...</Player.Root>
 * ```
 *
 * Partial overrides also work — pass only the keys you want to change and
 * the rest fall back to the active locale's defaults.
 */
import { createContext, createElement, useContext, useMemo, type ReactNode } from "react";

/** Every user-visible string the React adapter emits. */
export interface PlayerLabels {
  /** Wrapper bar `aria-label`. */
  controlsBar: string;
  /** Play button label when paused. */
  play: string;
  /** Pause button label when playing. */
  pause: string;
  /** Mute toggle when currently unmuted. */
  mute: string;
  /** Mute toggle when currently muted. */
  unmute: string;
  /** Volume slider label. */
  volume: string;
  /** Seek bar label. */
  seek: string;
  /** Fixed-step backward seek button label. */
  seekBackward: (seconds: number) => string;
  /** Fixed-step forward seek button label. */
  seekForward: (seconds: number) => string;
  /** Picture-in-Picture toggle entering PiP. */
  pipEnter: string;
  /** Picture-in-Picture toggle exiting PiP. */
  pipExit: string;
  /** Fullscreen toggle entering fullscreen. */
  fullscreenEnter: string;
  /** Fullscreen toggle exiting fullscreen. */
  fullscreenExit: string;
  /** Playback-rate selector. */
  playbackRate: string;
  /** Quality selector. */
  quality: string;
  /** Auto quality option label (HLS ABR). */
  qualityAuto: string;
  /** Time label, formatted for the current position. */
  timeCurrent: (formatted: string) => string;
  /** Time label, formatted for the total duration. */
  timeDuration: (formatted: string) => string;
  /** Time label, formatted for the remaining time. */
  timeRemaining: (formatted: string) => string;
  /** Light-mode poster overlay click-to-play label. */
  posterPlay: string;
}

/** English defaults — the public OSS shape. */
export const defaultLabels: PlayerLabels = {
  controlsBar: "Video controls",
  play: "Play",
  pause: "Pause",
  mute: "Mute",
  unmute: "Unmute",
  volume: "Volume",
  seek: "Seek",
  seekBackward: (seconds) => `Rewind ${seconds} seconds`,
  seekForward: (seconds) => `Forward ${seconds} seconds`,
  pipEnter: "Picture-in-picture",
  pipExit: "Exit picture-in-picture",
  fullscreenEnter: "Fullscreen",
  fullscreenExit: "Exit fullscreen",
  playbackRate: "Playback speed",
  quality: "Quality",
  qualityAuto: "Auto",
  timeCurrent: (formatted) => `Current time ${formatted}`,
  timeDuration: (formatted) => `Total duration ${formatted}`,
  timeRemaining: (formatted) => `Time remaining ${formatted}`,
  posterPlay: "Play video",
};

/**
 * Vietnamese preset for F8 consumers. Matches the legacy hardcoded strings
 * that were removed from individual controls so existing visual screenshots
 * stay the same when opt-in is enabled.
 */
export const vietnameseLabels: PlayerLabels = {
  controlsBar: "Điều khiển video",
  play: "Phát",
  pause: "Tạm dừng",
  mute: "Tắt tiếng",
  unmute: "Bật tiếng",
  volume: "Âm lượng",
  seek: "Vị trí phát",
  seekBackward: (seconds) => `Tua lại ${seconds} giây`,
  seekForward: (seconds) => `Tua tới ${seconds} giây`,
  pipEnter: "Hình trong hình",
  pipExit: "Thoát chế độ hình trong hình",
  fullscreenEnter: "Toàn màn hình",
  fullscreenExit: "Thoát toàn màn hình",
  playbackRate: "Tốc độ phát",
  quality: "Chất lượng video",
  qualityAuto: "Tự động",
  timeCurrent: (formatted) => `Vị trí hiện tại: ${formatted}`,
  timeDuration: (formatted) => `Thời lượng: ${formatted}`,
  timeRemaining: (formatted) => `Còn lại: ${formatted}`,
  posterPlay: "Phát video",
};

const LabelsContext = createContext<PlayerLabels>(defaultLabels);

export interface LabelsProviderProps {
  /**
   * Partial override merged on top of `defaultLabels`. Pass
   * `vietnameseLabels` for the full Vietnamese preset.
   */
  labels?: Partial<PlayerLabels>;
  children?: ReactNode;
}

/** Internal helper — `<Player.Root>` mounts this above its tree. */
export function LabelsProvider({ labels, children }: LabelsProviderProps): JSX.Element {
  const value = useMemo<PlayerLabels>(() => ({ ...defaultLabels, ...(labels ?? {}) }), [labels]);
  return createElement(LabelsContext.Provider, { value }, children);
}

/** Subscribe to the active labels from any control. */
export function useLabels(): PlayerLabels {
  return useContext(LabelsContext);
}
