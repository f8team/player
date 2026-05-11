import { describe, expect, it, vi } from "vitest";

import { createEventBus } from "../events/bus.js";
import { type Player } from "../types/player.js";

import { createPluginBus } from "./bus.js";
import { createCommandRegistry } from "./commands.js";
import { definePlugin } from "./definePlugin.js";
import { createControlsRegistry, createPluginHost } from "./host.js";

const STUB_STATE = {
  status: "idle" as const,
  source: null,
  currentTime: 0,
  duration: 0,
  buffered: [],
  playbackRate: 1,
  volume: 1,
  muted: false,
  videoWidth: 0,
  videoHeight: 0,
  pip: false,
  fullscreen: false,
  qualities: [],
  activeQuality: null,
  error: null,
};

function fakePlayer(): Player {
  return {} as Player;
}

function makeFixture() {
  const player = fakePlayer();
  const commands = createCommandRegistry();
  const controls = createControlsRegistry();
  const bus = createEventBus();
  const host = createPluginHost({
    commands,
    controls,
    store: { getState: () => STUB_STATE, subscribe: () => () => undefined },
    bus,
  });
  return { player, host, commands, controls, bus, pluginBus: createPluginBus({ player, host }) };
}

describe("createPluginBus", () => {
  it("registers a plugin and runs its setup with player + host", () => {
    const { player, host, pluginBus } = makeFixture();
    const setup = vi.fn();
    pluginBus.register({ name: "p1", setup });
    expect(setup).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledWith(player, host);
    expect(pluginBus.has("p1")).toBe(true);
    expect(pluginBus.list()).toEqual(["p1"]);
  });

  it("throws on double-registration of the same name", () => {
    const { pluginBus } = makeFixture();
    pluginBus.register({ name: "p", setup: () => undefined });
    expect(() => pluginBus.register({ name: "p", setup: () => undefined })).toThrow(
      /already registered/,
    );
  });

  it("unregister calls the teardown and removes the plugin", () => {
    const { pluginBus } = makeFixture();
    const teardown = vi.fn();
    pluginBus.register({ name: "p", setup: () => teardown });
    pluginBus.unregister("p");
    expect(teardown).toHaveBeenCalledTimes(1);
    expect(pluginBus.has("p")).toBe(false);
  });

  it("unregister(unknown) is a no-op", () => {
    const { pluginBus } = makeFixture();
    expect(() => pluginBus.unregister("ghost")).not.toThrow();
  });

  it("disposeAll runs teardowns in reverse-registration order", () => {
    const { pluginBus } = makeFixture();
    const order: string[] = [];
    pluginBus.register({
      name: "a",
      setup: () => () => order.push("a"),
    });
    pluginBus.register({
      name: "b",
      setup: () => () => order.push("b"),
    });
    pluginBus.register({
      name: "c",
      setup: () => () => order.push("c"),
    });
    pluginBus.disposeAll();
    expect(order).toEqual(["c", "b", "a"]);
    expect(pluginBus.list()).toEqual([]);
  });

  it("a teardown throw does not abort the rest", () => {
    const { pluginBus } = makeFixture();
    const consoleErr = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const order: string[] = [];
    pluginBus.register({
      name: "a",
      setup: () => () => order.push("a"),
    });
    pluginBus.register({
      name: "b",
      setup: () => () => {
        order.push("b");
        throw new Error("boom");
      },
    });
    pluginBus.register({
      name: "c",
      setup: () => () => order.push("c"),
    });
    pluginBus.disposeAll();
    expect(order).toEqual(["c", "b", "a"]);
    expect(consoleErr).toHaveBeenCalled();
    consoleErr.mockRestore();
  });

  it("a setup throw is wrapped with the plugin name and rethrown", () => {
    const { pluginBus } = makeFixture();
    expect(() =>
      pluginBus.register({
        name: "broken",
        setup: () => {
          throw new Error("invalid");
        },
      }),
    ).toThrow(/plugin "broken" setup threw/);
  });

  it("plugins without a teardown are tracked and removed cleanly", () => {
    const { pluginBus } = makeFixture();
    pluginBus.register({ name: "noTeardown", setup: () => undefined });
    expect(pluginBus.has("noTeardown")).toBe(true);
    pluginBus.unregister("noTeardown");
    expect(pluginBus.has("noTeardown")).toBe(false);
  });

  it("definePlugin is the identity helper", () => {
    const spec = { name: "x", setup: () => undefined };
    expect(definePlugin(spec)).toBe(spec);
  });
});
