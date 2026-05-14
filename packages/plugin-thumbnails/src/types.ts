/**
 * Public types of `@f8team/reel-plugin-thumbnails`.
 *
 * The plugin parses a WebVTT cue map (sprite thumbnails) and exposes
 * `thumbnails:getAt(time)` so consumers (React `Controls.SeekBar`, the Lit
 * default chrome) can render a hover preview tooltip without re-parsing the
 * VTT themselves.
 */

/** Result of a single VTT cue parse — one thumbnail tile inside a sprite sheet. */
export interface ThumbnailCue {
  /** Cue start time, seconds. */
  start: number;
  /** Cue end time, seconds. */
  end: number;
  /** Absolute (or resolved-relative) URL of the sprite sheet. */
  src: string;
  /** Tile X offset inside the sheet, pixels. `0` when `#xywh=` is missing. */
  x: number;
  /** Tile Y offset inside the sheet, pixels. */
  y: number;
  /**
   * Tile width in pixels. `0` when `#xywh=` is missing — consumers should
   * fall back to natural image size.
   */
  w: number;
  /** Tile height in pixels. */
  h: number;
}

/**
 * Plugin options — currently no public knobs. Reserved for forward
 * compatibility (e.g. retry policy, custom fetcher).
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ThumbnailsPluginOptions {}
