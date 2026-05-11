import { describe, expect, it, vi } from "vitest";

import { createEventBus } from "../events/bus.js";

import { createCommandRegistry } from "./commands.js";
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

const stubStore = {
  getState: () => STUB_STATE,
  subscribe: () => () => undefined,
};

describe("createControlsRegistry", () => {
  it("contributions land in their slot", () => {
    const reg = createControlsRegistry();
    const render = (): Element => document.createElement("button");
    reg.contribute("seekbar.overlay", render);
    expect(reg.snapshot("seekbar.overlay")).toHaveLength(1);
    expect(reg.snapshot("menu.settings")).toHaveLength(0);
  });

  it("disposer removes the contribution", () => {
    const reg = createControlsRegistry();
    const render = (): Element => document.createElement("span");
    const dispose = reg.contribute("foo", render);
    expect(reg.snapshot("foo")).toHaveLength(1);
    dispose();
    expect(reg.snapshot("foo")).toHaveLength(0);
  });

  it("clear empties every slot", () => {
    const reg = createControlsRegistry();
    reg.contribute("a", () => document.createElement("a"));
    reg.contribute("b", () => document.createElement("b"));
    reg.clear();
    expect(reg.snapshot("a")).toHaveLength(0);
    expect(reg.snapshot("b")).toHaveLength(0);
  });
});

describe("createPluginHost", () => {
  it("delegates contribute to the controls registry", () => {
    const controls = createControlsRegistry();
    const host = createPluginHost({
      commands: createCommandRegistry(),
      controls,
      store: stubStore,
      bus: createEventBus(),
    });
    const render = (): Element => document.createElement("div");
    host.controls.contribute("settings", render);
    expect(controls.snapshot("settings")).toHaveLength(1);
  });

  it("emit forwards to the typed event bus", () => {
    const bus = createEventBus();
    const host = createPluginHost({
      commands: createCommandRegistry(),
      controls: createControlsRegistry(),
      store: stubStore,
      bus,
    });
    const handler = vi.fn();
    bus.on("subtitles:change", handler);
    host.emit("subtitles:change", { lang: "vi" });
    expect(handler).toHaveBeenCalledWith({ lang: "vi" });
  });

  it("commands proxy the registry", () => {
    const commands = createCommandRegistry();
    const host = createPluginHost({
      commands,
      controls: createControlsRegistry(),
      store: stubStore,
      bus: createEventBus(),
    });
    const handler = vi.fn();
    host.commands.add("noop", handler);
    host.commands.run("noop");
    expect(handler).toHaveBeenCalled();
  });
});
