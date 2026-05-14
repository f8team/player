import type { Disposer, SubtitleTrack } from "@f8team/reel-core";
import { useEffect, useState } from "react";

import { usePlayer } from "../../hooks/usePlayer.js";
import { usePlayerState } from "../../hooks/usePlayerState.js";
import { useLabels } from "../../i18n.js";

import { ControlMenu, type ControlMenuOption } from "./ControlMenu.js";
import { PlayerIcon } from "./icons.js";

/**
 * State payload emitted by `@f8team/reel-plugin-subtitles`. Mirrors
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
 * Wires through `@f8team/reel-plugin-subtitles` commands:
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

  const selectCaptions = (value: string): void => {
    if (value === "__off__") {
      player.commands.run("subtitles:off");
      setActiveLang(null);
      return;
    }
    player.commands.run("subtitles:setLang", value as unknown as Record<string, unknown>);
    setActiveLang(value);
  };

  const isActive = activeLang !== null;
  const options: ControlMenuOption[] = [
    {
      value: "__off__",
      label: labels.captionsOff,
      active: !isActive,
      onSelect: () => selectCaptions("__off__"),
    },
    ...tracks.map((t: SubtitleTrack) => ({
      value: t.srcLang,
      label: t.label,
      active: t.srcLang === activeLang,
      onSelect: () => selectCaptions(t.srcLang),
    })),
  ];

  return (
    <ControlMenu
      className={className}
      control="captions"
      menuId="captions"
      ariaLabel={labels.captions}
      active={isActive}
      trigger={
        <>
          <PlayerIcon name="cc" />
          <span data-reel-trigger-label="">{activeLang ? activeLang.toUpperCase() : "CC"}</span>
        </>
      }
      options={options}
    />
  );
}
