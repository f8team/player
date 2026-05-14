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
  "color-bg": "--reel-color-bg",
  "color-fg": "--reel-color-fg",
  "color-accent": "--reel-color-accent",
  "color-overlay": "--reel-color-overlay",
  "control-size": "--reel-control-size",
  "control-radius": "--reel-control-radius",
  "control-gap": "--reel-control-gap",
  "control-padding": "--reel-control-padding",
  "focus-ring-color": "--reel-focus-ring-color",
  "focus-ring-width": "--reel-focus-ring-width",
  "seekbar-height": "--reel-seekbar-height",
  "seekbar-buffered": "--reel-seekbar-buffered",
  "seekbar-played": "--reel-seekbar-played",
  "seekbar-knob-size": "--reel-seekbar-knob-size",
  "font-family": "--reel-font-family",
  "font-size-sm": "--reel-font-size-sm",
  "font-size-md": "--reel-font-size-md",
  "motion-fast": "--reel-motion-fast",
  "motion-base": "--reel-motion-base",
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
  "seekbar-played": "var(--reel-color-accent)",
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
