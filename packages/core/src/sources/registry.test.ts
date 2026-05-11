import { describe, expect, it } from "vitest";

import { type SourceProvider } from "../types/source.js";

import { createSourceRegistry } from "./registry.js";

function fakeProvider(
  name: string,
  verdict: ReturnType<SourceProvider["canHandle"]>,
): SourceProvider {
  return {
    name,
    canHandle: () => verdict,
    createLoader: () => ({
      attach: async () => undefined,
      detach: () => undefined,
    }),
  };
}

describe("createSourceRegistry", () => {
  it("registers and lists providers", () => {
    const reg = createSourceRegistry();
    reg.register(fakeProvider("a", true));
    reg.register(fakeProvider("b", false));
    expect(reg.list().map((p) => p.name)).toEqual(["a", "b"]);
  });

  it("throws when re-registering the same name", () => {
    const reg = createSourceRegistry();
    reg.register(fakeProvider("a", true));
    expect(() => reg.register(fakeProvider("a", true))).toThrow(/already registered/);
  });

  it("returns the disposer to unregister", () => {
    const reg = createSourceRegistry();
    const dispose = reg.register(fakeProvider("a", true));
    expect(reg.list()).toHaveLength(1);
    dispose();
    expect(reg.list()).toHaveLength(0);
  });

  it("unregister(name) removes the provider", () => {
    const reg = createSourceRegistry();
    reg.register(fakeProvider("a", true));
    reg.register(fakeProvider("b", true));
    reg.unregister("a");
    expect(reg.list().map((p) => p.name)).toEqual(["b"]);
  });

  it("unregister(unknown) is a no-op", () => {
    const reg = createSourceRegistry();
    reg.register(fakeProvider("a", true));
    reg.unregister("ghost");
    expect(reg.list().map((p) => p.name)).toEqual(["a"]);
  });

  it("resolve picks the first definite match", () => {
    const reg = createSourceRegistry();
    const a = fakeProvider("a", false);
    const b = fakeProvider("b", true);
    const c = fakeProvider("c", true);
    reg.register(a);
    reg.register(b);
    reg.register(c);
    expect(reg.resolve({ src: "x" })?.name).toBe("b");
  });

  it("resolve falls back to the first 'maybe' if no definite match exists", () => {
    const reg = createSourceRegistry();
    reg.register(fakeProvider("native", "maybe"));
    reg.register(fakeProvider("hls", false));
    expect(reg.resolve({ src: "x" })?.name).toBe("native");
  });

  it("resolve returns null when nothing matches", () => {
    const reg = createSourceRegistry();
    reg.register(fakeProvider("a", false));
    expect(reg.resolve({ src: "x" })).toBeNull();
  });

  it("clear() empties the registry", () => {
    const reg = createSourceRegistry();
    reg.register(fakeProvider("a", true));
    reg.clear();
    expect(reg.list()).toHaveLength(0);
  });
});
