/**
 * Shared command registry. Plugins and adapters publish/run commands through
 * this single instance.
 */

import { type CommandRegistry } from "../types/plugin.js";

export function createCommandRegistry(): CommandRegistry {
  type Handler = (payload: unknown) => void;
  const handlers = new Map<string, Handler>();

  function add<P>(name: string, handler: (payload: P) => void): () => void {
    if (handlers.has(name)) {
      throw new Error(`[@f8/player-core] command "${name}" is already registered`);
    }
    handlers.set(name, handler as Handler);
    return () => {
      const current = handlers.get(name);
      if (current === handler) handlers.delete(name);
    };
  }

  function run<P>(name: string, payload?: P): void {
    const handler = handlers.get(name);
    if (!handler) return;
    try {
      handler(payload);
    } catch (err) {
      console.error(`[@f8/player-core] command "${name}" threw:`, err);
    }
  }

  function has(name: string): boolean {
    return handlers.has(name);
  }

  return { add, run, has };
}
