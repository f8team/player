/**
 * Tests for `PlayerController` Reactive Controller.
 *
 * `@f8/player-core` is mocked so tests run in jsdom without HLS or a real
 * `HTMLVideoElement`. The mock exposes the same `createPlayer` factory shape.
 */
import { LitElement, html } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PlayerController } from "../PlayerController.js";

const mockPlayer = vi.hoisted(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  paused: vi.fn().mockReturnValue(true),
  seekTo: vi.fn(),
  getCurrentTime: vi.fn().mockReturnValue(0),
  getDuration: vi.fn().mockReturnValue(0),
  setSource: vi.fn(),
  setPlaybackRate: vi.fn(),
  setVolume: vi.fn(),
  setMuted: vi.fn(),
  on: vi.fn().mockReturnValue(() => undefined),
  off: vi.fn(),
  subscribe: vi.fn().mockReturnValue(() => undefined),
  attach: vi.fn().mockResolvedValue(undefined),
  detach: vi.fn(),
  dispose: vi.fn(),
  use: vi.fn(),
  removePlugin: vi.fn(),
  commands: { add: vi.fn(), run: vi.fn(), has: vi.fn() },
  getState: vi.fn(),
  getBuffered: vi.fn().mockReturnValue([]),
  getSource: vi.fn().mockReturnValue(null),
}));

vi.mock("@f8/player-core", () => ({
  createPlayer: vi.fn(() => mockPlayer),
}));

class Host extends LitElement {
  options = {};
  controller = new PlayerController(this, () => this.options);
  protected override createRenderRoot(): HTMLElement {
    return this;
  }
  protected override render(): unknown {
    return html`<div></div>`;
  }
}

const TAG = "host-for-pc-test";
if (!customElements.get(TAG)) customElements.define(TAG, Host);

beforeEach(() => {
  vi.clearAllMocks();
  mockPlayer.on.mockReturnValue(() => undefined);
  mockPlayer.subscribe.mockReturnValue(() => undefined);
  mockPlayer.attach.mockResolvedValue(undefined);
});

afterEach(() => {
  // Tear down every test element so each test starts clean.
  for (const el of Array.from(document.body.querySelectorAll(TAG))) {
    el.remove();
  }
});

function mount(): Host {
  const el = document.createElement(TAG) as Host;
  document.body.appendChild(el);
  return el;
}

describe("PlayerController", () => {
  it("creates a player on hostConnected and subscribes to the store", () => {
    const el = mount();
    expect(el.controller.player).toBe(mockPlayer);
    // The controller subscribes to the store to drive re-renders.
    expect(mockPlayer.subscribe).toHaveBeenCalledTimes(1);
  });

  it("disposes the player and unsubscribes on hostDisconnected", () => {
    const unsub = vi.fn();
    mockPlayer.subscribe.mockReturnValue(unsub);
    const el = mount();
    el.remove();
    expect(unsub).toHaveBeenCalled();
    expect(mockPlayer.dispose).toHaveBeenCalled();
    expect(el.controller.player).toBeNull();
  });

  it("does not re-create the player when reconnected within the same instance", () => {
    const el = mount();
    expect(mockPlayer.subscribe).toHaveBeenCalledTimes(1);
    // Trigger a manual hostConnected — should be a no-op while still connected.
    el.controller.hostConnected();
    expect(mockPlayer.subscribe).toHaveBeenCalledTimes(1);
  });

  it("attach() delegates to player.attach", async () => {
    const el = mount();
    const video = document.createElement("video");
    await el.controller.attach(video);
    expect(mockPlayer.attach).toHaveBeenCalledWith(video);
  });

  it("detach() delegates to player.detach", () => {
    const el = mount();
    el.controller.detach();
    expect(mockPlayer.detach).toHaveBeenCalled();
  });

  it("on() subscribes through the player and tracks the disposer", () => {
    const dispose = vi.fn();
    mockPlayer.on.mockReturnValue(dispose);
    const el = mount();
    const handler = vi.fn();
    const off = el.controller.on("play", handler);
    expect(mockPlayer.on).toHaveBeenCalledWith("play", handler);
    off();
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("on() handlers attached but not manually disposed are cleaned up on disconnect", () => {
    const dispose = vi.fn();
    mockPlayer.on.mockReturnValue(dispose);
    const el = mount();
    el.controller.on("ended", vi.fn());
    el.remove();
    expect(dispose).toHaveBeenCalled();
  });

  it("on() throws if called before hostConnected", () => {
    const el = document.createElement(TAG) as Host;
    // Not appended → not connected.
    expect(() => el.controller.on("play", () => undefined)).toThrow(/before hostConnected/);
  });

  it("attach() rejects if called before hostConnected", async () => {
    const el = document.createElement(TAG) as Host;
    const video = document.createElement("video");
    await expect(el.controller.attach(video)).rejects.toThrow(/before hostConnected/);
  });
});
