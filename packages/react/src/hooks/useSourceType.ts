import { detectSourceType } from "@f8team/reel-core";
import type { SourceType } from "@f8team/reel-core";

import { usePlayerState } from "./usePlayerState.js";

/**
 * Returns the resolved `SourceType` for the currently active source, or `null`
 * when no source is loaded.
 *
 * Useful for conditionally rendering controls or overlays based on whether the
 * active source is a native video, HLS, or an external embed (e.g. YouTube).
 *
 * @example
 * ```tsx
 * function MyControls() {
 *   const sourceType = useSourceType();
 *   // YouTube has its own controls — hide ours.
 *   if (sourceType === "youtube") return null;
 *   return <Controls.Bar>...</Controls.Bar>;
 * }
 * ```
 */
export function useSourceType(): SourceType | null {
  return usePlayerState((s) => {
    if (!s.source || !s.source.src) return null;
    return detectSourceType(s.source);
  });
}
