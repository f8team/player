import type { PlayerOptions, SourceDescriptor } from "@f8/player-core";
import {
  Captions,
  Controls,
  LightOverlay,
  Root,
  Spinner,
  Video,
  vietnameseLabels,
  type PlayerCallbackProps,
  type PlayerLabels,
  type RootProps,
} from "@f8/player-react";
import { type CSSProperties, type ReactNode, useCallback, useMemo, useState } from "react";

import {
  DEFAULT_F8_GATEWAY_ALLOWLIST,
  createF8WebPlayerPlugins,
  type F8WebPlayerPluginsOptions,
} from "./createF8WebPlayerPlugins.js";

/** Built-in playback rate menu used when consumer does not specify one. */
const DEFAULT_PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export type F8WebPlayerLight = boolean | string;

export interface F8WebPlayerProps extends PlayerCallbackProps {
  /** Quick-source convenience: forwarded to `source.src`. Wins over `options.source`. */
  src?: string;
  /** Full source descriptor (subtitles, thumbnails, withCredentials). */
  source?: SourceDescriptor;
  /** Poster URL — also used by `<Player.LightOverlay />` when `light` is set. */
  poster?: string;
  /** Initial mute state (post-mount setMuted goes via `muted` prop). */
  muted?: boolean;
  volume?: number;
  playbackRate?: number;
  /** Custom playback-rate menu values. Defaults to F8 standard set. */
  playbackRates?: readonly number[];
  /** Vietnamese labels by default. Pass partial overrides or English (`defaultLabels`). */
  labels?: Partial<PlayerLabels>;
  /**
   * Light overlay: show a poster + play button before first play. Set `true`
   * to use `poster`; set a string to use a custom URL.
   */
  light?: F8WebPlayerLight;
  /** Plugin tuple overrides — merged into `createF8WebPlayerPlugins(options)`. */
  plugins?: F8WebPlayerPluginsOptions;
  /** Extra raw player options (preload, autoplay, startTime, …). */
  options?: PlayerOptions;
  /** Forwarded to `<Player.Root playerRef />` for imperative access. */
  playerRef?: RootProps["playerRef"];
  /** Custom slot rendered before the controls bar (e.g. watermark, question overlay). */
  children?: ReactNode;
  /** Container className applied to the outer wrapper. */
  className?: string;
  style?: CSSProperties;
  /** Whether to render the default controls. Default `true`. */
  controls?: boolean;
}

/**
 * `<F8WebPlayer>` — opinionated one-liner that bundles the F8 web defaults:
 *
 * - Standard plugin tuple via `createF8WebPlayerPlugins`
 *   (markers / keyboard / hls-quality / auth / fullscreen / pip / subtitles
 *   / thumbnails / **prefs**).
 * - Vietnamese labels by default.
 * - `<Player.Spinner />` for buffering / quality switch.
 * - `<Player.LightOverlay />` when `light` is set.
 * - Default classroom-style controls bar.
 *
 * Reach for `<Player.Root>` directly when you need a fully custom layout — this
 * component is for the 80% case (course lessons, admin previews, story embeds).
 *
 * @phase-5-target T5.3
 */
export function F8WebPlayer({
  src,
  source,
  poster,
  muted,
  volume,
  playbackRate,
  playbackRates = DEFAULT_PLAYBACK_RATES,
  labels = vietnameseLabels,
  light,
  plugins,
  options,
  playerRef,
  children,
  className,
  style,
  controls = true,
  // Forward all callback props transparently to <Root>.
  ...callbacks
}: F8WebPlayerProps): JSX.Element {
  const [lightDismissed, setLightDismissed] = useState(false);

  // Build the effective source: src convenience shortcut wins, otherwise full
  // descriptor. Memoize so render-stable identity avoids setSource churn.
  const effectiveSource = useMemo<SourceDescriptor | undefined>(() => {
    if (source) return source;
    if (src) return { src };
    return undefined;
  }, [source, src]);

  // Build the effective plugin tuple. Default auth allowlist mirrors F8 prod.
  const pluginList = useMemo(() => {
    const opts: F8WebPlayerPluginsOptions = {
      auth: { allowlist: DEFAULT_F8_GATEWAY_ALLOWLIST },
      ...plugins,
    };
    return createF8WebPlayerPlugins(opts);
  }, [plugins]);

  const mergedOptions = useMemo<PlayerOptions>(
    () => ({
      ...options,
      plugins: pluginList,
      poster: poster ?? options?.poster,
    }),
    [options, pluginList, poster],
  );

  const lightPoster = useMemo(() => {
    if (light === true) return poster;
    if (typeof light === "string") return light;
    return undefined;
  }, [light, poster]);

  const isLightActive = light !== undefined && light !== false && !lightDismissed;

  const handleLightDismiss = useCallback(() => setLightDismissed(true), []);

  return (
    <Root
      options={mergedOptions}
      source={effectiveSource}
      poster={poster}
      muted={muted}
      volume={volume}
      playbackRate={playbackRate}
      labels={labels}
      playerRef={playerRef}
      {...callbacks}
    >
      <div data-f8-player="" className={className} style={style}>
        <Video />
        <Captions />
        <Spinner />
        {children}
        {isLightActive && <LightOverlay posterUrl={lightPoster} onDismiss={handleLightDismiss} />}
        {controls && !isLightActive && (
          <Controls.Bar layout="two-row">
            <Controls.TimelineRow>
              <Controls.Time variant="current" />
              <Controls.SeekBar />
              <Controls.Time variant="duration" />
            </Controls.TimelineRow>
            <Controls.ActionsRow>
              <Controls.SeekOffset seconds={-5} />
              <Controls.PlayPause />
              <Controls.SeekOffset seconds={5} />
              <Controls.Mute />
              <Controls.Volume />
              <Controls.Quality />
              <Controls.Captions />
              <Controls.Settings rates={playbackRates as number[]} />
              <Controls.Pip />
              <Controls.Fullscreen />
            </Controls.ActionsRow>
          </Controls.Bar>
        )}
      </div>
    </Root>
  );
}
