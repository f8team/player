import { describe, expect, it, vi } from "vitest";

import { createEventBus } from "./bus.js";

describe("createEventBus", () => {
  it("calls handlers registered before emit", () => {
    const bus = createEventBus();
    const handler = vi.fn();
    bus.on("play", handler);
    bus.emit("play");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("passes the typed payload to the handler", () => {
    const bus = createEventBus();
    const handler = vi.fn();
    bus.on("timeupdate", handler);
    bus.emit("timeupdate", { currentTime: 1, playedSeconds: 1, duration: 10 });
    expect(handler).toHaveBeenCalledWith({ currentTime: 1, playedSeconds: 1, duration: 10 });
  });

  it("dedupes when the same listener is registered twice for the same event", () => {
    const bus = createEventBus();
    const handler = vi.fn();
    bus.on("play", handler);
    bus.on("play", handler);
    bus.emit("play");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("supports multiple distinct listeners for the same event", () => {
    const bus = createEventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.on("pause", a);
    bus.on("pause", b);
    bus.emit("pause");
    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  it("the disposer returned by on() removes the listener", () => {
    const bus = createEventBus();
    const handler = vi.fn();
    const dispose = bus.on("play", handler);
    bus.emit("play");
    dispose();
    bus.emit("play");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("off() removes the specific listener", () => {
    const bus = createEventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.on("play", a);
    bus.on("play", b);
    bus.off("play", a);
    bus.emit("play");
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });

  it("off() on an unknown event is a no-op", () => {
    const bus = createEventBus();
    expect(() => bus.off("play", () => undefined)).not.toThrow();
  });

  it("listenerCount reflects on/off accurately", () => {
    const bus = createEventBus();
    const h = (): void => undefined;
    expect(bus.listenerCount("play")).toBe(0);
    const dispose = bus.on("play", h);
    expect(bus.listenerCount("play")).toBe(1);
    dispose();
    expect(bus.listenerCount("play")).toBe(0);
  });

  it("emit on an event with no listeners is a no-op", () => {
    const bus = createEventBus();
    expect(() => bus.emit("play")).not.toThrow();
  });

  it("listener removal during emit does not skip remaining listeners", () => {
    const bus = createEventBus();
    const order: string[] = [];
    let stopB: (() => void) | undefined;

    bus.on("play", () => {
      order.push("a");
      stopB?.();
    });
    stopB = bus.on("play", () => {
      order.push("b");
    });
    bus.on("play", () => {
      order.push("c");
    });

    bus.emit("play");
    expect(order).toEqual(["a", "b", "c"]);
  });

  it("a throwing listener does not abort the rest", () => {
    const bus = createEventBus();
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const a = vi.fn(() => {
      throw new Error("boom");
    });
    const b = vi.fn();
    bus.on("play", a);
    bus.on("play", b);
    bus.emit("play");
    expect(b).toHaveBeenCalled();
    expect(consoleErr).toHaveBeenCalled();
    consoleErr.mockRestore();
  });

  it("supports plugin-namespaced events (foo:bar)", () => {
    const bus = createEventBus();
    const handler = vi.fn();
    bus.on("subtitles:change", handler);
    bus.emit("subtitles:change", { lang: "vi" });
    expect(handler).toHaveBeenCalledWith({ lang: "vi" });
  });

  it("clear() removes every listener", () => {
    const bus = createEventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.on("play", a);
    bus.on("ended", b);
    bus.clear();
    bus.emit("play");
    bus.emit("ended");
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it("emit a second time on a removed-then-re-added listener works", () => {
    const bus = createEventBus();
    const handler = vi.fn();
    bus.on("play", handler);
    bus.off("play", handler);
    bus.on("play", handler);
    bus.emit("play");
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
