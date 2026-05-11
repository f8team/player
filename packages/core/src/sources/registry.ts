/**
 * Source registry.
 *
 * Providers register themselves once. On `resolve(source)`, the registry
 * picks the first provider whose `canHandle` returns `true`, falling back to
 * the first `"maybe"` (the native loader uses `"maybe"` so it can absorb any
 * source without claiming it).
 */

import { type SourceDescriptor, type SourceProvider } from "../types/source.js";

export interface SourceRegistry {
  register(provider: SourceProvider): () => void;
  unregister(name: string): void;
  resolve(source: SourceDescriptor): SourceProvider | null;
  /** Snapshot list of registered providers. Useful for tests. */
  list(): readonly SourceProvider[];
  clear(): void;
}

export function createSourceRegistry(): SourceRegistry {
  const providers: SourceProvider[] = [];

  function register(provider: SourceProvider): () => void {
    if (providers.some((p) => p.name === provider.name)) {
      throw new Error(`[@f8/player-core] source provider "${provider.name}" is already registered`);
    }
    providers.push(provider);
    return () => unregister(provider.name);
  }

  function unregister(name: string): void {
    const idx = providers.findIndex((p) => p.name === name);
    if (idx >= 0) providers.splice(idx, 1);
  }

  function resolve(source: SourceDescriptor): SourceProvider | null {
    let fallback: SourceProvider | null = null;
    for (const p of providers) {
      const verdict = p.canHandle(source);
      if (verdict === true) return p;
      if (verdict === "maybe" && !fallback) fallback = p;
    }
    return fallback;
  }

  function list(): readonly SourceProvider[] {
    return providers.slice();
  }

  function clear(): void {
    providers.length = 0;
  }

  return { register, unregister, resolve, list, clear };
}
