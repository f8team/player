/**
 * Plugin lifecycle bus. Tracks registered plugins, calls each `setup`, stores
 * the optional teardown, and runs all teardowns on `disposeAll`.
 *
 * Re-registering a plugin with the same name throws — names are the public
 * identity surface and double-register usually means a build/import bug.
 */

import { type Player } from "../types/player.js";
import { type PluginHost, type PluginInstance } from "../types/plugin.js";

interface Entry {
  plugin: PluginInstance;
  teardown: (() => void) | null;
}

export interface PluginBus {
  /** Register a plugin. Throws if `plugin.name` is already registered. */
  register(plugin: PluginInstance): void;
  /** Remove a plugin by name and run its teardown (idempotent). */
  unregister(name: string): void;
  /** Whether a plugin is registered. */
  has(name: string): boolean;
  /** Snapshot of currently registered plugin names. */
  list(): string[];
  /** Tear down every plugin in reverse-registration order. */
  disposeAll(): void;
}

export interface CreatePluginBusArgs {
  player: Player;
  host: PluginHost;
}

export function createPluginBus({ player, host }: CreatePluginBusArgs): PluginBus {
  const entries: Entry[] = [];

  function findIndex(name: string): number {
    return entries.findIndex((e) => e.plugin.name === name);
  }

  function register(plugin: PluginInstance): void {
    if (findIndex(plugin.name) >= 0) {
      throw new Error(`[@f8/player-core] plugin "${plugin.name}" is already registered`);
    }
    let teardown: (() => void) | null = null;
    try {
      const result = plugin.setup(player, host);
      teardown = typeof result === "function" ? result : null;
    } catch (err) {
      throw new Error(
        `[@f8/player-core] plugin "${plugin.name}" setup threw: ${(err as Error).message}`,
        { cause: err },
      );
    }
    entries.push({ plugin, teardown });
  }

  function unregister(name: string): void {
    const idx = findIndex(name);
    if (idx < 0) return;
    const entry = entries.splice(idx, 1)[0];
    if (!entry) return;
    if (entry.teardown) {
      try {
        entry.teardown();
      } catch (err) {
        console.error(`[@f8/player-core] plugin "${name}" teardown threw:`, err);
      }
    }
  }

  function has(name: string): boolean {
    return findIndex(name) >= 0;
  }

  function list(): string[] {
    return entries.map((e) => e.plugin.name);
  }

  function disposeAll(): void {
    // Reverse order so teardowns mirror the registration sequence.
    while (entries.length) {
      const entry = entries.pop();
      if (entry?.teardown) {
        try {
          entry.teardown();
        } catch (err) {
          console.error(
            `[@f8/player-core] plugin "${entry.plugin.name}" teardown threw on dispose:`,
            err,
          );
        }
      }
    }
  }

  return { register, unregister, has, list, disposeAll };
}
