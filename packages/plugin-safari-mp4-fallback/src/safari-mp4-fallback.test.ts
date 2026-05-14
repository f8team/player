import type { Player, PluginHost, PlayerEvents } from "@f8team/reel-core";
import { describe, expect, it, vi } from "vitest";

import { createSafariMp4FallbackPlugin } from "./safari-mp4-fallback.js";

type Handler<K extends keyof PlayerEvents> = (payload: PlayerEvents[K]) => void;

function makePlayer(src = "https://cdn.example.com/video.m3u8") {
  const handlers: Partial<{ [K in keyof PlayerEvents]: Handler<K>[] }> = {};
  return {
    getSource: () => ({ src }),
    setSource: vi.fn(),
    getState: vi.fn().mockReturnValue({ status: "idle", source: null }),
    on: vi
      .fn()
      .mockImplementation(<K extends keyof PlayerEvents>(event: K, handler: Handler<K>) => {
        if (!handlers[event]) (handlers as Record<string, unknown[]>)[event as string] = [];
        (handlers[event] as Handler<K>[]).push(handler);
        return () => {
          const list = handlers[event] as Handler<K>[] | undefined;
          if (!list) return;
          const i = list.indexOf(handler);
          if (i >= 0) list.splice(i, 1);
        };
      }),
    fire: <K extends keyof PlayerEvents>(event: K, payload: PlayerEvents[K]) => {
      (handlers[event] as Handler<K>[] | undefined)?.forEach((h) => h(payload));
    },
    play: vi.fn(),
    pause: vi.fn(),
    paused: vi.fn(),
    seekTo: vi.fn(),
    setPlaybackRate: vi.fn(),
    setVolume: vi.fn(),
    setMuted: vi.fn(),
    getCurrentTime: vi.fn(),
    getDuration: vi.fn(),
    getBuffered: vi.fn(),
    subscribe: vi.fn().mockReturnValue(() => undefined),
    off: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    dispose: vi.fn(),
    use: vi.fn(),
    removePlugin: vi.fn(),
    commands: { add: vi.fn().mockReturnValue(() => undefined), run: vi.fn(), has: vi.fn() },
  } as unknown as Player & {
    fire: <K extends keyof PlayerEvents>(e: K, p: PlayerEvents[K]) => void;
  };
}

function makeHost(): PluginHost {
  return {
    controls: { contribute: vi.fn().mockReturnValue(() => undefined) },
    commands: { add: vi.fn().mockReturnValue(() => undefined), run: vi.fn(), has: vi.fn() },
    store: { getState: vi.fn(), subscribe: vi.fn().mockReturnValue(() => undefined) },
    emit: vi.fn(),
  } as unknown as PluginHost;
}

function mockSafari(is: boolean): void {
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    value: is
      ? "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/605 (KHTML, like Gecko) Version/16 Safari/605"
      : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537 Chrome/120 Safari/537",
  });
}

describe("createSafariMp4FallbackPlugin", () => {
  it("has name 'safari-mp4-fallback'", () => {
    expect(createSafariMp4FallbackPlugin().name).toBe("safari-mp4-fallback");
  });

  it("does nothing on non-Safari browsers", () => {
    mockSafari(false);
    const player = makePlayer();
    const plugin = createSafariMp4FallbackPlugin();
    plugin.setup(player, makeHost());
    player.fire("error", { code: "source", message: "err", retryable: false });
    expect(player.setSource).not.toHaveBeenCalled();
  });

  it("retries with MP4 URL on Safari when source error fires", () => {
    mockSafari(true);
    const player = makePlayer("https://cdn.example.com/video.m3u8");
    createSafariMp4FallbackPlugin().setup(player, makeHost());
    player.fire("error", { code: "source", message: "err", retryable: false });
    expect(player.setSource).toHaveBeenCalledWith(
      expect.objectContaining({ src: "https://cdn.example.com/video.mp4", type: "mp4" }),
    );
  });

  it("only retries once (retried flag)", () => {
    mockSafari(true);
    const player = makePlayer();
    createSafariMp4FallbackPlugin().setup(player, makeHost());
    player.fire("error", { code: "source", message: "err", retryable: false });
    player.fire("error", { code: "source", message: "err", retryable: false });
    expect(player.setSource).toHaveBeenCalledTimes(1);
  });

  it("accepts custom resolveMp4 callback", () => {
    mockSafari(true);
    const player = makePlayer("https://cdn.example.com/video.m3u8");
    const resolveMp4 = vi.fn().mockReturnValue("https://cdn.example.com/hq.mp4");
    createSafariMp4FallbackPlugin({ resolveMp4 }).setup(player, makeHost());
    player.fire("error", { code: "source", message: "err", retryable: false });
    expect(resolveMp4).toHaveBeenCalledWith("https://cdn.example.com/video.m3u8");
    expect(player.setSource).toHaveBeenCalledWith(
      expect.objectContaining({ src: "https://cdn.example.com/hq.mp4" }),
    );
  });

  it("teardown removes the error listener", () => {
    mockSafari(true);
    const player = makePlayer();
    const teardown = createSafariMp4FallbackPlugin().setup(player, makeHost());
    teardown?.();
    player.fire("error", { code: "source", message: "err", retryable: false });
    expect(player.setSource).not.toHaveBeenCalled();
  });
});
