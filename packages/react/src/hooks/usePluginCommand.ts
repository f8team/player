import { useEffect } from "react";

import { usePlayerContext } from "../context/PlayerContext.js";

/**
 * Run a plugin command whenever its argument reference changes.
 *
 * Replaces the `MarkersSyncBridge` / `_runPlayerCommand` boilerplate consumers
 * write to push reactive data into a plugin (markers, questions, skip
 * segments, watermark text, …). Safe-by-default: missing commands are
 * swallowed, so it is fine to call before the plugin has registered.
 *
 * The command runs:
 *   - Once on mount (when `args` !== `undefined`).
 *   - Again whenever `args` changes by reference (use `useMemo` upstream to
 *     control identity if needed).
 *
 * @example Markers
 * ```tsx
 * usePluginCommand("markers:setMarkers", markers);
 * ```
 *
 * @example Skip segments
 * ```tsx
 * usePluginCommand("skipSegments:set", skipSegments);
 * ```
 *
 * @example Watermark
 * ```tsx
 * usePluginCommand("watermark:setText", `User #${userId}`);
 * ```
 */
export function usePluginCommand(name: string, args: unknown): void {
  const { player } = usePlayerContext();

  useEffect(() => {
    if (args === undefined) return;
    try {
      // Fire-and-forget; missing-command errors are swallowed by design so the
      // calling component does not crash when a plugin isn't installed (matches
      // f8-pro-ui `_runPlayerCommand`).
      player.commands.run(name, args);
    } catch {
      // Synchronous "command not registered" path. Same reasoning.
    }
  }, [player, name, args]);
}
