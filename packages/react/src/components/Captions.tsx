import { usePlayerState } from "../hooks/usePlayerState.js";

/**
 * `<Player.Captions>` — mounts a `<track kind="subtitles">` per subtitle track
 * declared in the active source.
 *
 * The `<track>` elements are rendered as children of the player's `<video>` via
 * a portal. Because React cannot portal into the `<video>` element itself, we
 * render the tracks as siblings and let the native engine pick them up — the
 * actual `<video>` appending is done inside `<Player.Video>`.
 *
 * For proper subtitle rendering the `<Video>` and `<Captions>` components
 * should always be co-located inside the same `<Player.Root>`.
 *
 * Golden cases: G1 (course learning), G15 (VTT cross-origin with
 * `crossOrigin="anonymous"`).
 */
export function Captions(): JSX.Element | null {
  const tracks = usePlayerState((s) => s.source?.tracks);

  if (!tracks || tracks.length === 0) return null;

  return (
    <>
      {tracks.map((track) => (
        <track
          key={track.srcLang + track.src}
          kind="subtitles"
          src={track.src}
          srcLang={track.srcLang}
          label={track.label}
          default={track.default}
        />
      ))}
    </>
  );
}
