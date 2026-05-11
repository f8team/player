import { describe, expect, it, vi } from "vitest";

import { createStore } from "./store.js";

interface TestState {
  count: number;
  text: string;
  list: number[];
}

function makeStore() {
  const flushQueue: Array<() => void> = [];
  const store = createStore<TestState>(
    { count: 0, text: "hello", list: [] },
    { scheduleFlush: (run) => flushQueue.push(run) },
  );
  const flush = () => {
    while (flushQueue.length) flushQueue.shift()?.();
  };
  return { store, flush };
}

describe("createStore", () => {
  it("returns the initial state via getState", () => {
    const { store } = makeStore();
    expect(store.getState()).toEqual({ count: 0, text: "hello", list: [] });
  });

  it("setState merges partial patches", () => {
    const { store, flush } = makeStore();
    store.setState({ count: 1 });
    store.setState({ text: "world" });
    flush();
    expect(store.getState()).toEqual({ count: 1, text: "world", list: [] });
  });

  it("setState supports a functional updater", () => {
    const { store, flush } = makeStore();
    store.setState((s) => ({ count: s.count + 5 }));
    store.setState((s) => ({ count: s.count + 3 }));
    flush();
    expect(store.getState().count).toBe(8);
  });

  it("batches multiple setState calls into one flush", () => {
    const { store, flush } = makeStore();
    const listener = vi.fn();
    store.subscribe((s) => s.count, listener);
    store.setState({ count: 1 });
    store.setState({ count: 2 });
    store.setState({ count: 3 });
    expect(listener).not.toHaveBeenCalled();
    flush();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith(3);
  });

  it("subscribers fire only when the selected slice changes", () => {
    const { store, flush } = makeStore();
    const onCount = vi.fn();
    const onText = vi.fn();
    store.subscribe((s) => s.count, onCount);
    store.subscribe((s) => s.text, onText);

    store.setState({ count: 1 });
    flush();
    expect(onCount).toHaveBeenCalledTimes(1);
    expect(onText).not.toHaveBeenCalled();

    store.setState({ text: "abc" });
    flush();
    expect(onCount).toHaveBeenCalledTimes(1);
    expect(onText).toHaveBeenCalledTimes(1);
  });

  it("does not fire a subscriber whose slice resolves to the same primitive", () => {
    const { store, flush } = makeStore();
    const listener = vi.fn();
    store.subscribe((s) => s.count, listener);

    store.setState({ count: 0 }); // same as initial
    flush();
    expect(listener).not.toHaveBeenCalled();

    store.setState({ count: 1 });
    flush();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("disposers remove the subscription synchronously", () => {
    const { store, flush } = makeStore();
    const listener = vi.fn();
    const dispose = store.subscribe((s) => s.count, listener);

    store.setState({ count: 1 });
    flush();
    expect(listener).toHaveBeenCalledTimes(1);

    dispose();
    store.setState({ count: 2 });
    flush();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("dispose removes every subscriber and ignores future setState", () => {
    const { store, flush } = makeStore();
    const a = vi.fn();
    const b = vi.fn();
    store.subscribe((s) => s.count, a);
    store.subscribe((s) => s.text, b);

    store.dispose();

    store.setState({ count: 99 });
    flush();
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it("subscribe after dispose returns a no-op disposer", () => {
    const { store } = makeStore();
    store.dispose();
    const disposer = store.subscribe(
      (s) => s.count,
      () => {
        throw new Error("must never run");
      },
    );
    expect(() => disposer()).not.toThrow();
  });

  it("a throwing listener does not abort the rest", () => {
    const { store, flush } = makeStore();
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const ok = vi.fn();
    store.subscribe(
      (s) => s.count,
      () => {
        throw new Error("boom");
      },
    );
    store.subscribe((s) => s.count, ok);

    store.setState({ count: 1 });
    flush();

    expect(ok).toHaveBeenCalledTimes(1);
    expect(consoleErr).toHaveBeenCalled();
    consoleErr.mockRestore();
  });

  it("removal during emit does not skip remaining listeners", () => {
    const { store, flush } = makeStore();
    const order: string[] = [];
    let dispose2: (() => void) | undefined;

    store.subscribe(
      (s) => s.count,
      () => {
        order.push("a");
        dispose2?.();
      },
    );
    dispose2 = store.subscribe(
      (s) => s.count,
      () => {
        order.push("b");
      },
    );
    store.subscribe(
      (s) => s.count,
      () => {
        order.push("c");
      },
    );

    store.setState({ count: 1 });
    flush();

    // 'a' removes 'b' mid-emit; the snapshot model means 'b' still fires once,
    // and 'c' must run regardless.
    expect(order).toContain("a");
    expect(order).toContain("c");
    // 'b' fires once because the snapshot was taken before removal
    expect(order.filter((x) => x === "b")).toHaveLength(1);
  });

  it("subscribe seeds `last` from the current state (no spurious first call)", () => {
    const { store, flush } = makeStore();
    store.setState({ count: 5 });
    flush();
    const listener = vi.fn();
    store.subscribe((s) => s.count, listener);
    flush();
    expect(listener).not.toHaveBeenCalled();
  });

  it("flushes via the default queueMicrotask when no schedule override is given", async () => {
    const store = createStore<TestState>({ count: 0, text: "", list: [] });
    const listener = vi.fn();
    store.subscribe((s) => s.count, listener);
    store.setState({ count: 1 });
    await Promise.resolve(); // flush microtasks
    expect(listener).toHaveBeenCalledWith(1);
  });

  it("respects a custom isEqual override at the store level", () => {
    const flushQueue: Array<() => void> = [];
    const store = createStore<TestState>(
      { count: 0, text: "", list: [1, 2, 3] },
      {
        scheduleFlush: (run) => flushQueue.push(run),
        // Treat any two arrays of the same length as equal — proves the
        // override path is taken.
        isEqual: <U>(a: U, b: U) =>
          Array.isArray(a) && Array.isArray(b) ? a.length === b.length : Object.is(a, b),
      },
    );

    const listener = vi.fn();
    store.subscribe((s) => s.list, listener);

    store.setState({ list: [4, 5, 6] }); // length unchanged
    while (flushQueue.length) flushQueue.shift()?.();
    expect(listener).not.toHaveBeenCalled();

    store.setState({ list: [7] }); // length changed
    while (flushQueue.length) flushQueue.shift()?.();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
