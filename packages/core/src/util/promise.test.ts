import { describe, expect, it, vi } from "vitest";

import { oncePerKey, withTimeout } from "./promise.js";

describe("withTimeout", () => {
  it("resolves with the original value if it settles in time", async () => {
    await expect(withTimeout(Promise.resolve(42), 100)).resolves.toBe(42);
  });

  it("rejects with TimeoutError when the deadline is exceeded", async () => {
    vi.useFakeTimers();
    const slow = new Promise(() => undefined);
    const promise = withTimeout(slow, 50);
    const expectation = expect(promise).rejects.toMatchObject({ name: "TimeoutError" });
    vi.advanceTimersByTime(50);
    await expectation;
    vi.useRealTimers();
  });

  it("propagates rejections from the source promise", async () => {
    const err = new Error("nope");
    await expect(withTimeout(Promise.reject(err), 100)).rejects.toBe(err);
  });

  it("ms <= 0 returns the original promise without timeout machinery", async () => {
    const p = Promise.resolve("ok");
    expect(withTimeout(p, 0)).toBe(p);
  });

  it("uses the custom message when provided", async () => {
    vi.useFakeTimers();
    const promise = withTimeout(new Promise(() => undefined), 10, "boom");
    const expectation = expect(promise).rejects.toThrow("boom");
    vi.advanceTimersByTime(10);
    await expectation;
    vi.useRealTimers();
  });
});

describe("oncePerKey", () => {
  it("dedupes in-flight calls per key", async () => {
    const cache = oncePerKey<string, number>();
    const factory = vi.fn(async () => 42);
    const [a, b] = await Promise.all([cache.get("k", factory), cache.get("k", factory)]);
    expect(a).toBe(42);
    expect(b).toBe(42);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("retries after rejection (does not cache failures)", async () => {
    const cache = oncePerKey<string, number>();
    const factory = vi
      .fn<() => Promise<number>>()
      .mockRejectedValueOnce(new Error("first"))
      .mockResolvedValueOnce(7);

    await expect(cache.get("k", factory)).rejects.toThrow("first");
    await expect(cache.get("k", factory)).resolves.toBe(7);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it("invalidate forces a refetch", async () => {
    const cache = oncePerKey<string, number>();
    const factory = vi.fn(async () => Math.random());
    const a = await cache.get("k", factory);
    cache.invalidate("k");
    const b = await cache.get("k", factory);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(typeof a).toBe("number");
    expect(typeof b).toBe("number");
  });

  it("clear empties every key", async () => {
    const cache = oncePerKey<string, number>();
    const factory = vi.fn(async () => 1);
    await cache.get("a", factory);
    await cache.get("b", factory);
    cache.clear();
    await cache.get("a", factory);
    await cache.get("b", factory);
    expect(factory).toHaveBeenCalledTimes(4);
  });
});
