/**
 * Identity helper used by plugin authors so editors get type narrowing
 * on `setup` arguments without typing `as PluginInstance` at every call site.
 *
 * @example
 * const subtitles = definePlugin({
 *   name: "subtitles",
 *   setup: (player, host) => { ... },
 * });
 */
import { type PluginInstance } from "../types/plugin.js";

export function definePlugin(spec: PluginInstance): PluginInstance {
  return spec;
}
