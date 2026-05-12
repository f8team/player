import type { Disposer, SubtitleTrack } from "@f8/player-core";
import { type ChangeEvent, useEffect, useState } from "react";

import { usePlayer } from "../../hooks/usePlayer.js";
import { usePlayerState } from "../../hooks/usePlayerState.js";
import { useLabels } from "../../i18n.js";

import { PlayerIcon } from "./icons.js";

/**
 * State payload emitted by `@f8/player-plugin-subtitles`. Mirrors
 * `SubtitleTrackState` from the plugin without taking a hard dependency.
 */
interface SubtitleTrackStateLite {
  lang: string;
  label: string;
  mode: "showing" | "hidden" | "disabled";
}

export interface CaptionsProps {
  className?: string;
  /**
   * Force-hide the control even when subtitle tracks are present (useful
   * for surfaces that own their own captions UI such as Story).
   */
  hidden?: boolean;
}

/**
 * `<Player.Controls.Captions>` — toggle subtitles on/off and pick a
 * language from the active source's `tracks`. Hidden when no tracks exist.
 *
 * Wires through `@f8/player-plugin-subtitles` commands:
 * - `subtitles:setLang` — switch language (shows that track).
 * - `subtitles:off` — hide all tracks.
 *
 * The plugin emits `subtitles:changed` whenever the active mode changes
 * (e.g. native CC button or external command); we mirror that event into
 * local state so the `<select>` value reflects reality.
 */
export function Captions({ className, hidden }: CaptionsProps): JSX.Element | null {
  const player = usePlayer();
  const labels = useLabels();
  const tracks = usePlayerState((s) => s.source?.tracks ?? []);

  // Active language — `null` means "off". Initialised from track defaults
  // and updated by the plugin's `subtitles:changed` event.
  const [activeLang, setActiveLang] = useState<string | null>(() => {
    if (!tracks || tracks.length === 0) return null;
    const def = tracks.find((t) => t.default);
    return def?.srcLang ?? tracks[0]?.srcLang ?? null;
  });

  useEffect(() => {
    type ChangedEvent = "subtitles:changed";
    const onAny = player.on as unknown as (
      event: ChangedEvent,
      handler: (payload: unknown) => void,
    ) => Disposer;
    return onAny("subtitles:changed", (payload) => {
      const states = payload as SubtitleTrackStateLite[] | undefined;
      if (!Array.isArray(states)) return;
      const showing = states.find((s) => s.mode === "showing");
      setActiveLang(showing?.lang ?? null);
    });
  }, [player]);

  if (hidden || !tracks || tracks.length === 0) return null;

  const handleChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const value = e.target.value;
    if (value === "__off__") {
      player.commands.run("subtitles:off");
      setActiveLang(null);
      return;
    }
    player.commands.run("subtitles:setLang", value as unknown as Record<string, unknown>);
    setActiveLang(value);
  };

  const isActive = activeLang !== null;
  const selectValue = activeLang ?? "__off__";

  return (
    <span
      className={className}
      data-f8-player-control="captions"
      data-f8-player-captions-active={isActive ? "" : undefined}
    >
      <PlayerIcon name="cc" />
      <select
        value={selectValue}
        onChange={handleChange}
        aria-label={labels.captions}
        data-f8-player-captions-select=""
      >
        <option value="__off__">{labels.captionsOff}</option>
        {tracks.map((t: SubtitleTrack) => (
          <option key={t.srcLang} value={t.srcLang}>
            {t.label}
          </option>
        ))}
      </select>
    </span>
  );
}
