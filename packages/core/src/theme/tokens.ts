/**
 * Default token values. Phase 3 ships theme CSS files (`classroom.css`,
 * `story.css`, `admin.css`, `minimal.css`) that override these via class
 * selectors. The defaults below are intentionally neutral so an unstyled
 * player still looks reasonable.
 */

import { type ThemeName, type ThemeTokens } from "../types/theme.js";

/**
 * Token name → CSS custom property name. Adapters write to the variable
 * directly so consumers can also use plain CSS to override.
 */
export const TOKEN_TO_CSS_VAR: Record<keyof ThemeTokens, string> = {
  "color-bg": "--f8p-color-bg",
  "color-fg": "--f8p-color-fg",
  "color-accent": "--f8p-color-accent",
  "color-overlay": "--f8p-color-overlay",
  "control-size": "--f8p-control-size",
  "control-radius": "--f8p-control-radius",
  "control-gap": "--f8p-control-gap",
  "control-padding": "--f8p-control-padding",
  "focus-ring-color": "--f8p-focus-ring-color",
  "focus-ring-width": "--f8p-focus-ring-width",
  "seekbar-height": "--f8p-seekbar-height",
  "seekbar-buffered": "--f8p-seekbar-buffered",
  "seekbar-played": "--f8p-seekbar-played",
  "seekbar-knob-size": "--f8p-seekbar-knob-size",
  "font-family": "--f8p-font-family",
  "font-size-sm": "--f8p-font-size-sm",
  "font-size-md": "--f8p-font-size-md",
  "motion-fast": "--f8p-motion-fast",
  "motion-base": "--f8p-motion-base",
};

/**
 * Neutral default tokens. Adapters apply these on the player root before any
 * theme class wins. Values use `1rem = 10px` (F8 frontends use the 62.5%
 * font-size convention).
 */
export const DEFAULT_TOKENS: Required<ThemeTokens> = {
  "color-bg": "#0d0d0d",
  "color-fg": "#ffffff",
  "color-accent": "#ff5722",
  "color-overlay": "rgba(0, 0, 0, 0.55)",

  "control-size": "3.6rem",
  "control-radius": "0.8rem",
  "control-gap": "0.8rem",
  "control-padding": "0.8rem",

  "focus-ring-color": "#3ea6ff",
  "focus-ring-width": "0.2rem",

  "seekbar-height": "0.4rem",
  "seekbar-buffered": "rgba(255, 255, 255, 0.35)",
  "seekbar-played": "var(--f8p-color-accent)",
  "seekbar-knob-size": "1.2rem",

  "font-family": "system-ui, -apple-system, 'Segoe UI', sans-serif",
  "font-size-sm": "1.2rem",
  "font-size-md": "1.4rem",

  "motion-fast": "120ms",
  "motion-base": "200ms",
};

/** Built-in theme presets. Phase 3 packages the CSS counterpart. */
export const THEME_PRESETS: Record<ThemeName, ThemeTokens> = {
  classroom: {
    "color-bg": "#0e1117",
    "color-accent": "#ff6b00",
    "control-size": "4.0rem",
    "seekbar-height": "0.4rem",
  },
  story: {
    "color-bg": "transparent",
    "color-overlay": "rgba(0, 0, 0, 0.45)",
    "control-size": "4.4rem",
    "seekbar-height": "0.3rem",
  },
  admin: {
    "color-bg": "#1a1d23",
    "color-accent": "#3ea6ff",
    "control-size": "3.2rem",
    "seekbar-height": "0.5rem",
  },
  minimal: {
    "color-bg": "transparent",
    "control-size": "3.0rem",
    "seekbar-height": "0.3rem",
  },
};
