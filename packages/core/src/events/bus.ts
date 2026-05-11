/**
 * Typed event bus.
 *
 * - Built-in events use the `PlayerEvents` map for full type safety.
 * - Plugin events use the `${string}:${string}` form (e.g. `subtitles:change`).
 *   They bypass the type map because plugins are loaded dynamically; the
 *   compromise is intentional and documented in the API contract.
 *
 * Invariants the tests guard:
 * - Listener removal during emit does not skip remaining listeners (snapshot).
 * - A throwing listener does not abort the rest (errors logged via `console.error`).
 * - Multiple `on()` of the same listener for the same event are deduped (Set).
 */

import { type PlayerEvents } from "../types/events.js";

type EventName = keyof PlayerEvents | (string & { __namespace?: never });

type Listener = (payload: unknown) => void;

export interface EventBus<TMap = PlayerEvents> {
  on<K extends keyof TMap>(event: K, listener: (payload: TMap[K]) => void): () => void;
  on(event: string, listener: (payload: unknown) => void): () => void;
  off<K extends keyof TMap>(event: K, listener: (payload: TMap[K]) => void): void;
  off(event: string, listener: (payload: unknown) => void): void;
  emit<K extends keyof TMap>(
    event: K,
    ...args: TMap[K] extends void ? [] : [payload: TMap[K]]
  ): void;
  emit(event: string, payload?: unknown): void;
  /** Drop every listener. Used by `player.dispose`. */
  clear(): void;
  /** Number of listeners for an event. Useful for tests. */
  listenerCount(event: string): number;
}

/**
 * Construct a typed event bus.
 *
 * Built-in `PlayerEvents` are fully type-checked; plugin events use the
 * `${namespace}:${verb}` form and pass through untyped (plugins can
 * augment via declaration-merging if they want stricter typing).
 */
export function createEventBus<TMap = PlayerEvents>(): EventBus<TMap> {
  const buckets = new Map<string, Set<Listener>>();

  function on(event: EventName, listener: Listener): () => void {
    const key = String(event);
    let set = buckets.get(key);
    if (!set) {
      set = new Set();
      buckets.set(key, set);
    }
    set.add(listener);
    return () => off(event, listener);
  }

  function off(event: EventName, listener: Listener): void {
    const key = String(event);
    const set = buckets.get(key);
    if (!set) return;
    set.delete(listener);
    if (set.size === 0) buckets.delete(key);
  }

  function emit(event: EventName, payload?: unknown): void {
    const key = String(event);
    const set = buckets.get(key);
    if (!set || set.size === 0) return;
    // Snapshot so listeners removing themselves (or other listeners) during
    // emit don't shift the iteration order.
    const snapshot = Array.from(set);
    for (const listener of snapshot) {
      try {
        listener(payload);
      } catch (err) {
        console.error(`[@f8/player-core] listener for "${key}" threw:`, err);
      }
    }
  }

  function clear(): void {
    buckets.clear();
  }

  function listenerCount(event: string): number {
    return buckets.get(event)?.size ?? 0;
  }

  return {
    on: on as EventBus<TMap>["on"],
    off: off as EventBus<TMap>["off"],
    emit: emit as EventBus<TMap>["emit"],
    clear,
    listenerCount,
  };
}
