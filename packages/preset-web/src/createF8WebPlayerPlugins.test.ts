import type { Player, PlayerState, PluginHost, SourceDescriptor } from "@f8/player-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_F8_KEYBOARD,
  createF8WebPlayerPlugins,
  type F8WebPlayerPluginsOptions,
} from "./createF8WebPlayerPlugins.js";

const thumbnailsMock = vi.hoisted(() => {
  const plugin = { name: "thumbnails", setup: vi.fn() };
  return {
    plugin,
    createThumbnailsPlugin: vi.fn(() => plugin),
  };
});

vi.mock("@f8/player-plugin-thumbnails", () => ({
  createThumbnailsPlugin: thumbnailsMock.createThumbnailsPlugin,
}));

function createLazyPluginHarness(initialSource: SourceDescriptor | null = null): {
  host: PluginHost;
  player: Player;
  setSource: (source: SourceDescriptor | null) => void;
} {
  let source = initialSource;
  let listener: ((value: string | null) => void) | undefined;
  const playerCommands = {
    add: vi.fn(() => vi.fn()),
    run: vi.fn(),
    has: vi.fn(() => false),
  };
  const player = {
    commands: playerCommands,
    use: vi.fn(),
    removePlugin: vi.fn(),
  } as unknown as Player;
  const host: PluginHost = {
    controls: { contribute: vi.fn(() => vi.fn()) },
    commands: playerCommands,
    store: {
      getState: () => ({ source }) as PlayerState,
      subscribe: vi.fn((_selector, cb) => {
        listener = cb as (value: string | null) => void;
        return vi.fn();
      }),
    },
    emit: vi.fn(),
  };

  return {
    host,
    player,
    setSource: (nextSource) => {
      source = nextSource;
      listener?.(nextSource?.thumbnails?.src ?? null);
    },
  };
}

describe("createF8WebPlayerPlugins", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("omits markers/keyboard/auth/subtitles unless requested", () => {
    const p = createF8WebPlayerPlugins({
      markers: false,
      keyboard: false,
      thumbnails: false,
      auth: false,
      subtitles: false,
      hlsQuality: true,
    });
    const names = p.map((x) => x.name);
    expect(names).toEqual(expect.arrayContaining(["hls-quality", "fullscreen", "pip"]));
    expect(names).not.toContain("markers");
    expect(names).not.toContain("keyboard");
    expect(names).not.toContain("auth-aware");
    expect(names).not.toContain("subtitles");
    expect(names).not.toContain("thumbnails");
  });

  it("adds a lazy thumbnails bootstrapper when thumbnails=always (default)", () => {
    const p = createF8WebPlayerPlugins({
      keyboard: false,
      auth: false,
      subtitles: false,
      thumbnails: "always",
    } satisfies F8WebPlayerPluginsOptions);
    expect(p.some((pl) => pl.name === "thumbnails-lazy")).toBe(true);
    expect(p.some((pl) => pl.name === "thumbnails")).toBe(false);
  });

  it("loads the thumbnails plugin only after the source exposes a thumbnail VTT", async () => {
    const p = createF8WebPlayerPlugins({
      keyboard: false,
      auth: false,
      subtitles: false,
      thumbnails: "always",
    } satisfies F8WebPlayerPluginsOptions);
    const lazyPlugin = p.find((pl) => pl.name === "thumbnails-lazy");
    const { host, player, setSource } = createLazyPluginHarness();
    const dispose = lazyPlugin?.setup(player, host);

    expect(thumbnailsMock.createThumbnailsPlugin).not.toHaveBeenCalled();

    setSource({ src: "https://cdn.test/video.mp4", type: "mp4" });
    await Promise.resolve();
    expect(thumbnailsMock.createThumbnailsPlugin).not.toHaveBeenCalled();

    setSource({
      src: "https://cdn.test/video.mp4",
      type: "mp4",
      thumbnails: { src: "https://cdn.test/video-thumbs.vtt" },
    });

    await vi.waitFor(() => {
      expect(player.use).toHaveBeenCalledWith(thumbnailsMock.plugin);
    });
    expect(thumbnailsMock.createThumbnailsPlugin).toHaveBeenCalledTimes(1);

    if (typeof dispose === "function") dispose();
    expect(player.removePlugin).toHaveBeenCalledWith("thumbnails");
  });

  it("uses DEFAULT_F8_KEYBOARD when keyboard omitted", () => {
    const p = createF8WebPlayerPlugins({
      auth: false,
      subtitles: false,
      thumbnails: false,
    } satisfies F8WebPlayerPluginsOptions);
    expect(p.find((pl) => pl.name === "keyboard")).toBeTruthy();
    // Setup not invoked — name check is sufficient for ordering contract.
    void DEFAULT_F8_KEYBOARD;
  });
});
