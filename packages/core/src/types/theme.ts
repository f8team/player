/**
 * Theme tokens. Every visible token is a CSS custom property that adapters
 * inject via `style` or scoped CSS. Phase 1 ships the type only; Phase 1.K
 * defines the runtime token defaults; Phase 3 ships the four shipping themes
 * (`classroom`, `story`, `admin`, `minimal`).
 */
export type ThemeName = "classroom" | "story" | "admin" | "minimal";

/**
 * Subset of overridable design tokens. Adapters merge a partial set into the
 * defaults at runtime.
 */
export interface ThemeTokens {
  // Surface
  "color-bg"?: string;
  "color-fg"?: string;
  "color-accent"?: string;
  "color-overlay"?: string;
  // Controls
  "control-size"?: string;
  "control-radius"?: string;
  "control-gap"?: string;
  "control-padding"?: string;
  // Focus
  "focus-ring-color"?: string;
  "focus-ring-width"?: string;
  // Seek bar
  "seekbar-height"?: string;
  "seekbar-buffered"?: string;
  "seekbar-played"?: string;
  "seekbar-knob-size"?: string;
  // Typography
  "font-family"?: string;
  "font-size-sm"?: string;
  "font-size-md"?: string;
  // Motion
  "motion-fast"?: string;
  "motion-base"?: string;
}
