import type { ThumbnailCue } from "./types.js";

/**
 * Parse the time stamp portion of a VTT cue (`HH:MM:SS.mmm` or `MM:SS.mmm`).
 * Returns seconds. Invalid input → `NaN`.
 */
function parseVttTime(token: string): number {
  const m = token.trim().match(/^(?:(\d+):)?(\d+):(\d+)(?:[.,](\d+))?$/);
  if (!m) return NaN;
  const hours = m[1] ? Number(m[1]) : 0;
  const minutes = Number(m[2]);
  const seconds = Number(m[3]);
  const millis = m[4] ? Number(`0.${m[4]}`) : 0;
  return hours * 3600 + minutes * 60 + seconds + millis;
}

/**
 * Resolve a cue body URL against the VTT URL (so authors can ship relative
 * paths like `sprites/00001.jpg`). Falls back to the raw URL when `baseUrl`
 * is missing or invalid (e.g. running in a non-DOM test environment without
 * a base URL).
 */
function resolveSpriteUrl(rawUrl: string, baseUrl: string | undefined): string {
  if (!baseUrl) return rawUrl;
  // Already absolute (`http://`, `https://`, `data:`, `blob:`).
  if (/^[a-z][a-z0-9+.-]*:/i.test(rawUrl)) return rawUrl;
  try {
    return new URL(rawUrl, baseUrl).href;
  } catch {
    return rawUrl;
  }
}

/**
 * Parse a WebVTT body whose cues map a time range to a sprite tile.
 *
 * Accepts the canonical format:
 *
 * ```
 * WEBVTT
 *
 * 00:00:00.000 --> 00:00:10.000
 * sprites/00001.jpg#xywh=0,0,160,90
 * ```
 *
 * Lines that don't look like a cue are skipped (cue identifiers, blank
 * lines, `NOTE` blocks). When `#xywh=` is missing, the parser still emits a
 * cue with `x=y=w=h=0` so consumers can fall back to the natural image size.
 *
 * @param text Raw VTT body.
 * @param baseUrl Optional URL used to resolve relative sprite paths.
 *                Pass the absolute VTT URL when fetching from the network.
 */
export function parseSpriteVtt(text: string, baseUrl?: string): ThumbnailCue[] {
  if (!text) return [];

  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const cues: ThumbnailCue[] = [];

  let inNote = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (raw === undefined) continue;
    const line = raw.trim();

    if (!line) {
      inNote = false;
      continue;
    }
    // VTT NOTE blocks span until the next blank line.
    if (line.startsWith("NOTE")) {
      inNote = true;
      continue;
    }
    if (inNote) continue;

    // Detect a cue timestamp line. WebVTT spec separator is " --> " but be
    // permissive about whitespace (`-->` with optional spaces).
    const tsMatch = line.match(
      /^((?:\d+:)?\d+:\d+(?:[.,]\d+)?)\s*-->\s*((?:\d+:)?\d+:\d+(?:[.,]\d+)?)/,
    );
    if (!tsMatch || tsMatch[1] === undefined || tsMatch[2] === undefined) continue;

    const start = parseVttTime(tsMatch[1]);
    const end = parseVttTime(tsMatch[2]);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;

    // The cue payload is the next non-blank line (we ignore multi-line text
    // because sprite-thumbnail VTTs put the URL on a single line).
    let payload = "";
    for (let j = i + 1; j < lines.length; j++) {
      const raw = lines[j];
      if (raw === undefined) break;
      const candidate = raw.trim();
      if (!candidate) break;
      payload = candidate;
      i = j;
      break;
    }
    if (!payload) continue;

    const hashIdx = payload.indexOf("#");
    let rawUrl = payload;
    let x = 0;
    let y = 0;
    let w = 0;
    let h = 0;

    if (hashIdx >= 0) {
      rawUrl = payload.slice(0, hashIdx);
      const fragment = payload.slice(hashIdx + 1);
      // `xywh=x,y,w,h` per Media Fragments URI 1.0.
      const xywh = fragment.match(/^xywh=(\d+),(\d+),(\d+),(\d+)/i);
      if (xywh && xywh[1] && xywh[2] && xywh[3] && xywh[4]) {
        x = Number(xywh[1]);
        y = Number(xywh[2]);
        w = Number(xywh[3]);
        h = Number(xywh[4]);
      }
    }

    cues.push({
      start,
      end,
      src: resolveSpriteUrl(rawUrl, baseUrl),
      x,
      y,
      w,
      h,
    });
  }

  return cues;
}

/**
 * Find the cue whose `[start, end)` range covers `time`. Returns `null` when
 * `time` is outside every cue. Uses a binary search — the parsed array is
 * already sorted by `start` for any well-formed VTT.
 */
export function findCueAt(cues: readonly ThumbnailCue[], time: number): ThumbnailCue | null {
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
