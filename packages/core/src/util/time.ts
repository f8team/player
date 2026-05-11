/**
 * Time helpers shared by the seek bar, transcript markers (G8), and the
 * keyboard / commands layer.
 */

const TIME_RE = /^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:\.(\d+))?$/;

/**
 * Parse a time string like `"00:01:23"`, `"1:23"`, `"00:01:23.456"` to seconds.
 * Returns `NaN` for invalid input — callers should guard.
 *
 * Accepted forms:
 * - `"H:MM:SS"` / `"H:MM:SS.fff"`
 * - `"M:SS"` / `"MM:SS"` / `"MM:SS.fff"`
 *
 * Anything else (including bare numbers, negative values, NaN strings) is
 * `NaN`. Callers that want to accept numbers SHOULD test `typeof === "number"`
 * first.
 */
export function parseTime(input: string): number {
  if (typeof input !== "string") return Number.NaN;
  const trimmed = input.trim();
  const match = TIME_RE.exec(trimmed);
  if (!match) return Number.NaN;
  const [, hStr, mStr, sStr, fracStr] = match;
  const h = hStr ? Number.parseInt(hStr, 10) : 0;
  const m = Number.parseInt(mStr ?? "0", 10);
  const s = Number.parseInt(sStr ?? "0", 10);
  const frac = fracStr ? Number.parseFloat(`0.${fracStr}`) : 0;
  if (m > 59 || s > 59) return Number.NaN;
  return h * 3600 + m * 60 + s + frac;
}

/**
 * Format seconds to `H:MM:SS` (when ≥ 1h) or `MM:SS` (otherwise). NaN /
 * negative inputs are coerced to `0:00`.
 *
 * The ARIA-friendly verbose form (`"1 hour 2 minutes"`) is the adapter's job.
 */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number, len = 2): string => n.toString().padStart(len, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

/**
 * Coerce a time-like input to seconds. Accepts numbers, formatted strings,
 * and clamps negatives to 0.
 *
 * Returns `NaN` if the input cannot be coerced (so callers can refuse to
 * call `seekTo` rather than seeking to 0 silently).
 */
export function toSeconds(input: number | string): number {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return Number.NaN;
    return input < 0 ? 0 : input;
  }
  return parseTime(input);
}
