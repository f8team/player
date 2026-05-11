/**
 * Apply theme tokens to an element's `style`.
 *
 * Adapters call this once per mount and again whenever the theme prop changes.
 * Plugins can overlay extra tokens through the same helper.
 */

import { type ThemeName, type ThemeTokens } from "../types/theme.js";

import { DEFAULT_TOKENS, THEME_PRESETS, TOKEN_TO_CSS_VAR } from "./tokens.js";

export interface ApplyThemeArgs {
  /** Theme preset name. `undefined` skips preset application. */
  preset?: ThemeName;
  /** Extra token overrides. Wins over the preset. */
  overrides?: ThemeTokens;
  /** Whether to apply the neutral defaults first. Default: `true`. */
  applyDefaults?: boolean;
}

/**
 * Resolve a final token map by layering defaults → preset → overrides.
 */
export function resolveTokens(args: ApplyThemeArgs = {}): Partial<ThemeTokens> {
  const out: ThemeTokens = {};
  if (args.applyDefaults !== false) Object.assign(out, DEFAULT_TOKENS);
  if (args.preset) Object.assign(out, THEME_PRESETS[args.preset]);
  if (args.overrides) Object.assign(out, args.overrides);
  return out;
}

/**
 * Apply tokens to `element.style`. Returns a disposer that resets the
 * variables to their previous values (useful for adapters that need to
 * roll back on theme change).
 */
export function applyTheme(element: HTMLElement, args: ApplyThemeArgs = {}): () => void {
  const tokens = resolveTokens(args);
  const previous: Partial<Record<keyof ThemeTokens, string>> = {};
  for (const [key, value] of Object.entries(tokens)) {
    if (typeof value !== "string") continue;
    const cssVar = TOKEN_TO_CSS_VAR[key as keyof ThemeTokens];
    if (!cssVar) continue;
    previous[key as keyof ThemeTokens] = element.style.getPropertyValue(cssVar);
    element.style.setProperty(cssVar, value);
  }
  return () => {
    for (const [key, prev] of Object.entries(previous)) {
      const cssVar = TOKEN_TO_CSS_VAR[key as keyof ThemeTokens];
      if (!cssVar) continue;
      if (prev) element.style.setProperty(cssVar, prev);
      else element.style.removeProperty(cssVar);
    }
  };
}
