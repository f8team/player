/**
 * URL helpers used by the source registry to dispatch a source descriptor to
 * the right provider. Pure string predicates — no DOM, no I/O.
 */

import { type SourceDescriptor, type SourceType } from "../types/source.js";

/**
 * Heuristic for HLS m3u8 URLs.
 *
 * Accepts:
 * - `*.m3u8` (case-insensitive) at any path/query position
 * - `application/vnd.apple.mpegurl` MIME hints inside `?type=`
 *
 * Rejects:
 * - YouTube-hosted m3u8 (handled by the YouTube provider).
 * - Empty / non-string inputs.
 */
export function looksLikeHls(input: string | undefined | null): boolean {
  if (!input) return false;
  const lower = input.toLowerCase();
  if (lower.includes("youtube.com") || lower.includes("youtu.be")) return false;
  if (lower.includes(".m3u8")) return true;
  if (lower.includes("application/vnd.apple.mpegurl")) return true;
  return false;
}

/**
 * YouTube URL recognition. Matches `youtube.com/watch?v=`, `youtu.be/<id>`,
 * `youtube.com/embed/<id>`, and `youtube.com/shorts/<id>`.
 */
export function looksLikeYouTube(input: string | undefined | null): boolean {
  if (!input) return false;
  const lower = input.toLowerCase();
  return lower.includes("youtube.com") || lower.includes("youtu.be");
}

/**
 * MP4 / WebM / Ogg recognition by extension or `blob:` / `data:` schemes.
 */
export function looksLikeProgressive(input: string | undefined | null): boolean {
  if (!input) return false;
  const lower = input.toLowerCase();
  if (lower.startsWith("blob:") || lower.startsWith("data:")) return true;
  return /\.(mp4|m4v|webm|ogv)(\?|#|$)/.test(lower);
}

/**
 * Resolve the effective `SourceType` for a descriptor.
 *
 * Honors an explicit non-`auto` type. For `auto`, dispatch by URL: HLS first,
 * then YouTube, then progressive, falling back to `native` (which dispatches
 * to the always-on native loader).
 */
export function detectSourceType(source: SourceDescriptor): SourceType {
  if (source.type && source.type !== "auto") return source.type;
  if (looksLikeHls(source.src)) return "hls";
  if (looksLikeYouTube(source.src)) return "youtube";
  if (looksLikeProgressive(source.src)) return "mp4";
  return "native";
}

/**
 * Resolve a `withCredentials` policy against a concrete URL. `boolean` wins
 * outright; functions are called once per URL and SHOULD NOT throw.
 */
export function resolveWithCredentials(
  policy: SourceDescriptor["withCredentials"],
  url: string,
): boolean {
  if (typeof policy === "boolean") return policy;
  if (typeof policy === "function") {
    try {
      return policy(url);
    } catch {
      return false;
    }
  }
  return false;
}
