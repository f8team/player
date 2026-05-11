/**
 * Async helpers used by the YouTube/HLS providers and by `createPlayer`.
 */

/**
 * Resolve to the original promise's value if it settles before `ms`, or
 * reject with a `TimeoutError` otherwise.
 *
 * The error name is `"TimeoutError"` to match the WebStreams convention.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message?: string): Promise<T> {
  if (ms <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => {
      const err = new Error(message ?? `Timed out after ${ms}ms`);
      err.name = "TimeoutError";
      reject(err);
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(id);
        resolve(value);
      },
      (err) => {
        clearTimeout(id);
        reject(err);
      },
    );
  });
}

/**
 * Memoize an async factory by key. Subsequent calls with the same key reuse
 * the in-flight or fulfilled promise; rejections are not cached so the next
 * call retries.
 */
export function oncePerKey<TKey, TValue>(): {
  get: (key: TKey, factory: () => Promise<TValue>) => Promise<TValue>;
  invalidate: (key: TKey) => void;
  clear: () => void;
} {
  const cache = new Map<TKey, Promise<TValue>>();
  return {
    get(key, factory) {
      const cached = cache.get(key);
      if (cached) return cached;
      const promise = factory().catch((err) => {
        cache.delete(key);
        throw err;
      });
      cache.set(key, promise);
      return promise;
    },
    invalidate(key) {
      cache.delete(key);
    },
    clear() {
      cache.clear();
    },
  };
}
