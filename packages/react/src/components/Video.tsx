import { type ComponentPropsWithoutRef, useEffect, useRef } from "react";

import { usePlayerContext } from "../context/PlayerContext.js";

export type VideoProps = Omit<
  ComponentPropsWithoutRef<"video">,
  // Managed by the player engine; callers set these via PlayerOptions.
  "src" | "autoPlay" | "muted" | "loop" | "playsInline" | "crossOrigin" | "poster" | "preload"
>;

/**
 * `<Player.Video>` — renders the `<video>` element and wires it to the player
 * instance via `player.attach()`.
 *
 * All standard `<video>` props (e.g. `className`, `style`, `aria-label`) are
 * forwarded. Source / playback props are managed by `createPlayer` options.
 */
export function Video({ className, style, ...rest }: VideoProps): JSX.Element {
  const { player, options, poster } = usePlayerContext();
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    player.attach(el).catch(() => {
      // Attach rejection is surfaced through the player's error event.
    });
    return () => {
      player.detach();
    };
  }, [player]);

  // Poster: prefer the reactive context value (driven by `<Root poster={...}>`
  // in Phase 2); fall back to the once-on-mount `options.poster` seed.
  const effectivePoster = poster ?? options.poster;

  return (
    <video
      ref={ref}
      className={className}
      style={style}
      data-reel-video=""
      poster={effectivePoster}
      {...rest}
    />
  );
}
