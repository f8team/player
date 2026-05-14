/**
 * Reactive store with microtask-batched updates and selector subscriptions.
 *
 * Design goals:
 * - **Tiny**: ~30 lines of logic, no external runtime.
 * - **Predictable**: subscribers fire synchronously after the microtask flush.
 *   Multiple `setState` calls in the same tick fire one round of subscribers.
 * - **Selector-aware**: a subscriber registered with a selector only re-runs
 *   when its selected slice changes (`Object.is` equality by default).
 */

import { type MutableStore } from "../types/store.js";

interface Subscriber<U = unknown> {
  selector: (state: never) => U;
  listener: (value: U) => void;
  /** Cached selected value from the last fired tick. */
  last: U;
  /** Custom equality, defaulted to `Object.is`. */
  isEqual: (a: U, b: U) => boolean;
}

const defaultEquals = <U>(a: U, b: U): boolean => Object.is(a, b);

/**
 * Optional knobs handed to `createStore`.
 *
 * The generic `T` is unused at the type level today, but it locks the option
 * shape to a specific store so future per-state hooks (e.g. `selectorOf`)
 * stay backwards-compatible.
 */
export interface CreateStoreOptions<_T> {
  /**
   * Override the global microtask scheduler (used by tests so the store
   * can flush synchronously). Default: `queueMicrotask`.
   */
  scheduleFlush?: (run: () => void) => void;
  /** Custom equality at the store level, used by `subscribe` if none is passed. */
  isEqual?: <U>(a: U, b: U) => boolean;
}

/**
 * Build a reactive store seeded with `initial`.
 */
export function createStore<T extends object>(
  initial: T,
  options: CreateStoreOptions<T> = {},
): MutableStore<T> {
  const schedule = options.scheduleFlush ?? queueMicrotask;
  const defaultIsEqual =
    (options.isEqual as (<U>(a: U, b: U) => boolean) | undefined) ?? defaultEquals;

  let state: T = initial;
  /**
   * `subscribers` is a Set so removal during emit doesn't shift indices.
   * We snapshot to an array on flush.
   */
  const subscribers = new Set<Subscriber<unknown>>();
  let dirty = false;
  let disposed = false;

  function flush(): void {
    dirty = false;
    if (disposed) return;
    const snapshot = Array.from(subscribers);
    for (const sub of snapshot) {
      const next = (sub.selector as (s: T) => unknown)(state);
      if (sub.isEqual(next, sub.last)) continue;
      sub.last = next;
      try {
        sub.listener(next);
      } catch (err) {
        // One bad listener does not abort the rest. Surface for diagnosis.

        console.error("[@f8team/reel-core] store subscriber threw:", err);
      }
    }
  }

  function getState(): T {
    return state;
  }

  function setState(patch: Partial<T> | ((current: T) => Partial<T>)): void {
    if (disposed) return;
    const next = typeof patch === "function" ? patch(state) : patch;
    state = { ...state, ...next };
    if (!dirty) {
      dirty = true;
      schedule(flush);
    }
  }

  function subscribe<U>(selector: (state: T) => U, listener: (value: U) => void): () => void {
    if (disposed) {
      return () => {
        /* no-op: store is dead */
      };
    }
    const sub: Subscriber<U> = {
      selector: selector as (state: never) => U,
      listener,
      last: selector(state),
      isEqual: defaultIsEqual,
    };
    subscribers.add(sub as Subscriber<unknown>);
    return () => {
      subscribers.delete(sub as Subscriber<unknown>);
    };
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    subscribers.clear();
  }

  return { getState, setState, subscribe, dispose };
}
