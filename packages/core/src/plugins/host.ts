/**
 * Shared `PluginHost` factory. Each plugin gets a host bound to:
 * - the shared command registry (one per player)
 * - the typed event bus (for `emit`)
 * - a read-only view of the store
 * - the contribution slots for the active adapter
 */

import { type EventBus } from "../events/bus.js";
import { type CommandRegistry, type PluginHost } from "../types/plugin.js";
import { type PlayerState } from "../types/state.js";
import { type ReadableStore } from "../types/store.js";

/** The contribution registry the adapter reads from. */
export interface ControlsRegistry {
  contribute(slot: string, render: () => Element): () => void;
  /** Snapshot of the renders for a slot (adapter-only). */
  snapshot(slot: string): readonly (() => Element)[];
  /** Drop every contribution. */
  clear(): void;
}

export function createControlsRegistry(): ControlsRegistry {
  const slots = new Map<string, Set<() => Element>>();

  function contribute(slot: string, render: () => Element): () => void {
    let set = slots.get(slot);
    if (!set) {
      set = new Set();
      slots.set(slot, set);
    }
    set.add(render);
    return () => {
      slots.get(slot)?.delete(render);
    };
  }

  function snapshot(slot: string): readonly (() => Element)[] {
    const set = slots.get(slot);
    return set ? Array.from(set) : [];
  }

  function clear(): void {
    slots.clear();
  }

  return { contribute, snapshot, clear };
}

export interface CreateHostArgs {
  commands: CommandRegistry;
  controls: ControlsRegistry;
  store: ReadableStore<PlayerState>;
  bus: EventBus;
}

export function createPluginHost({ commands, controls, store, bus }: CreateHostArgs): PluginHost {
  return {
    controls: {
      contribute: (slot, render) => controls.contribute(slot, render),
    },
    commands,
    store,
    emit: (event, payload) => {
      bus.emit(event as string, payload);
    },
  };
}
