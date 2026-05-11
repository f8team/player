import { type Player } from "./player.js";
import { type PlayerState } from "./state.js";
import { type ReadableStore } from "./store.js";

/**
 * Command registry shared between the player and plugins. Commands are the
 * extension point for keyboard handlers, plugin contributions, and UI buttons.
 */
export interface CommandRegistry {
  /**
   * Register a command. Returns a disposer.
   *
   * Commands MUST be namespaced with a `<plugin>:<verb>` form
   * (e.g. `markers:seek`). Built-in commands use the `core:` prefix.
   *
   * Re-registering an identical name throws.
   */
  add<P = void>(name: string, handler: (payload: P) => void): () => void;
  /** Run a command. No-op if the command does not exist (idempotent). */
  run<P = void>(name: string, payload?: P): void;
  /** Whether the command exists. */
  has(name: string): boolean;
}

/**
 * Plugin host handed to each plugin's `setup` function. Provides the only
 * sanctioned ways to extend the player (controls, commands, store, events).
 */
export interface PluginHost {
  controls: {
    /**
     * Contribute a UI fragment to a slot owned by an adapter (e.g. `seekbar.overlay`,
     * `menu.settings`). Adapters render the returned `Element` directly.
     *
     * Returns a disposer. Plugins SHOULD store the disposer and call it on
     * cleanup; the player calls every disposer on `dispose`.
     */
    contribute(slot: string, render: () => Element): () => void;
  };
  /** Shared command registry. Plugins MUST namespace their commands. */
  commands: CommandRegistry;
  /** Read-only state. */
  store: ReadableStore<PlayerState>;
  /** Emit a custom plugin event. Use the `${plugin}:${verb}` namespace. */
  emit<K extends string>(event: K, payload?: unknown): void;
}

/**
 * Plugin instance. The factory pattern (`subtitles({ defaultLang })`) returns
 * an instance.
 */
export interface PluginInstance {
  /** Unique name. Re-registering the same name throws. */
  readonly name: string;
  /**
   * Setup hook. Called once when the plugin is registered (either via
   * `PlayerOptions.plugins` or `player.use(...)`).
   *
   * Optional return value: a teardown function called on `removePlugin` or
   * `dispose`.
   */
  setup(player: Player, host: PluginHost): void | (() => void);
}
