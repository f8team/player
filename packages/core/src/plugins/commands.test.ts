import { describe, expect, it, vi } from "vitest";

import { createCommandRegistry } from "./commands.js";

describe("createCommandRegistry", () => {
  it("registers and runs a command with a payload", () => {
    const reg = createCommandRegistry();
    const handler = vi.fn();
    reg.add<number>("seek", handler);
    reg.run("seek", 12);
    expect(handler).toHaveBeenCalledWith(12);
  });

  it("has() reflects registration", () => {
    const reg = createCommandRegistry();
    expect(reg.has("seek")).toBe(false);
    reg.add("seek", () => undefined);
    expect(reg.has("seek")).toBe(true);
  });

  it("run() on an unknown command is a no-op", () => {
    const reg = createCommandRegistry();
    expect(() => reg.run("ghost")).not.toThrow();
  });

  it("throws on double-registration", () => {
    const reg = createCommandRegistry();
    reg.add("seek", () => undefined);
    expect(() => reg.add("seek", () => undefined)).toThrow(/already registered/);
  });

  it("disposer removes the handler", () => {
    const reg = createCommandRegistry();
    const handler = vi.fn();
    const dispose = reg.add("seek", handler);
    reg.run("seek");
    dispose();
    reg.run("seek");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(reg.has("seek")).toBe(false);
  });

  it("disposer is a no-op if the command was already replaced", () => {
    const reg = createCommandRegistry();
    const a = vi.fn();
    const dispose = reg.add("seek", a);
    dispose();
    const b = vi.fn();
    reg.add("seek", b);
    dispose(); // double-dispose, b stays
    reg.run("seek");
    expect(b).toHaveBeenCalled();
  });

  it("a throwing handler does not propagate", () => {
    const reg = createCommandRegistry();
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => undefined);
    reg.add("boom", () => {
      throw new Error("kaboom");
    });
    expect(() => reg.run("boom")).not.toThrow();
    expect(consoleErr).toHaveBeenCalled();
    consoleErr.mockRestore();
  });
});
