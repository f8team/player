/**
 * Read-only view of the reactive store, handed to plugins via `PluginHost`.
 * Plugins observe state but never mutate it directly.
 */
export interface ReadableStore<T> {
  /** Snapshot read. */
  getState(): T;
  /** Subscribe to a slice. The listener fires only when the slice changes (===). */
  subscribe<U>(selector: (state: T) => U, listener: (value: U) => void): () => void;
}

/**
 * Internal mutable store. Adapters never see this; only `createPlayer` does.
 *
 * @internal
 */
export interface MutableStore<T> extends ReadableStore<T> {
  /**
   * Apply a partial update. Updates are coalesced inside one microtask, so
   * multiple `setState` calls within the same tick fire one round of
   * subscribers.
   */
  setState(patch: Partial<T> | ((current: T) => Partial<T>)): void;
  /** Drop every subscriber. */
  dispose(): void;
}
