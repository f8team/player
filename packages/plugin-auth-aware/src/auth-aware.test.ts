import type { Player, PluginHost, PlayerEvents } from "@f8/player-core";
import { describe, expect, it, vi } from "vitest";

import { createAuthAwarePlugin, __resetTrailingDotWarnForTests } from "./auth-aware.js";

type Handler<K extends keyof PlayerEvents> = (payload: PlayerEvents[K]) => void;

function makePlayer(overrides: { src?: string; status?: "playing" | "idle" } = {}) {
  const { src = "https://api-gateway.example.com/stream.m3u8", status = "idle" } = overrides;
  const handlers: Partial<{ [K in keyof PlayerEvents]: Handler<K>[] }> = {};

  return {
    getState: () => ({ status, currentTime: 0, duration: 0, source: null }),
    getSource: () => ({ src }),
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
    pause: vi.fn(),
    play: vi.fn(),
    commands: {
      add: vi.fn().mockReturnValue(() => undefined),
      run: vi.fn(),
      has: vi.fn().mockReturnValue(true),
    },
    subscribe: vi.fn().mockReturnValue(() => undefined),
    seekTo: vi.fn(),
    setPlaybackRate: vi.fn(),
    setVolume: vi.fn(),
    setMuted: vi.fn(),
    setSource: vi.fn(),
    getBuffered: vi.fn(),
    getCurrentTime: vi.fn(),
    getDuration: vi.fn(),
    paused: vi.fn(),
    off: vi.fn(),
    attach: vi.fn(),
    detach: vi.fn(),
    dispose: vi.fn(),
    use: vi.fn(),
    removePlugin: vi.fn(),
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

describe("createAuthAwarePlugin", () => {
  it("has name 'auth-aware'", () => {
    expect(createAuthAwarePlugin().name).toBe("auth-aware");
  });

  it("applies withCredentials when source URL matches allowlist on ready", () => {
    const player = makePlayer({ src: "https://api-gateway.example.com/stream.m3u8" });
    createAuthAwarePlugin({
      allowlist: ["https://api-gateway.example.com"],
    }).setup(player, makeHost());
    player.fire("ready", { duration: 100 });
    expect(player.commands.run).toHaveBeenCalledWith("hls:setWithCredentials", true);
  });

  it("does not set withCredentials for non-matching URLs", () => {
    const player = makePlayer({ src: "https://cdn.example.com/video.m3u8" });
    createAuthAwarePlugin({
      allowlist: ["https://api-gateway.example.com"],
    }).setup(player, makeHost());
    player.fire("ready", { duration: 100 });
    expect(player.commands.run).not.toHaveBeenCalledWith("hls:setWithCredentials", true);
  });

  it("calls onUnauthorized when error.code is 'unauthorized'", () => {
    const cb = vi.fn();
    const player = makePlayer();
    createAuthAwarePlugin({ onUnauthorized: cb }).setup(player, makeHost());
    player.fire("error", { code: "unauthorized", message: "401", retryable: false });
    expect(cb).toHaveBeenCalledWith("https://api-gateway.example.com/stream.m3u8", 401);
  });

  it("detects 403 from error message", () => {
    const cb = vi.fn();
    const player = makePlayer();
    createAuthAwarePlugin({ onUnauthorized: cb }).setup(player, makeHost());
    player.fire("error", { code: "unauthorized", message: "403 Forbidden", retryable: false });
    expect(cb).toHaveBeenCalledWith(expect.any(String), 403);
  });

  it("pauses on unauthorized error when status is playing", () => {
    const player = makePlayer({ status: "playing" });
    createAuthAwarePlugin().setup(player, makeHost());
    player.fire("error", { code: "unauthorized", message: "401", retryable: false });
    expect(player.pause).toHaveBeenCalled();
  });

  it("does not pause when pauseOnUnauthorized=false", () => {
    const player = makePlayer({ status: "playing" });
    createAuthAwarePlugin({ pauseOnUnauthorized: false }).setup(player, makeHost());
    player.fire("error", { code: "unauthorized", message: "401", retryable: false });
    expect(player.pause).not.toHaveBeenCalled();
  });

  it("ignores non-unauthorized errors", () => {
    const cb = vi.fn();
    const player = makePlayer();
    createAuthAwarePlugin({ onUnauthorized: cb }).setup(player, makeHost());
    player.fire("error", { code: "network", message: "net error", retryable: true });
    expect(cb).not.toHaveBeenCalled();
  });

  it("teardown removes listeners", () => {
    const cb = vi.fn();
    const player = makePlayer();
    const teardown = createAuthAwarePlugin({ onUnauthorized: cb }).setup(player, makeHost());
    teardown?.();
    player.fire("error", { code: "unauthorized", message: "401", retryable: false });
    expect(cb).not.toHaveBeenCalled();
  });

  it("allowlist accepts RegExp matchers (A12)", () => {
    const player = makePlayer({ src: "https://api-gateway.example.com/stream.m3u8" });
    createAuthAwarePlugin({
      allowlist: [/^https:\/\/api-gateway\./],
    }).setup(player, makeHost());
    player.fire("ready", { duration: 100 });
    expect(player.commands.run).toHaveBeenCalledWith("hls:setWithCredentials", true);
  });

  it("allowlist RegExp that requires a dot rejects literal-prefix domains (A12)", () => {
    // /^https:\/\/api-gateway\./ should NOT match "api-gateway-v2" (no dot).
    const player = makePlayer({ src: "https://api-gateway-v2.cdn.net/video.m3u8" });
    createAuthAwarePlugin({
      allowlist: [/^https:\/\/api-gateway\./],
    }).setup(player, makeHost());
    player.fire("ready", { duration: 100 });
    expect(player.commands.run).not.toHaveBeenCalledWith("hls:setWithCredentials", true);
  });

  it("allowlist accepts predicate functions (A12)", () => {
    const player = makePlayer({ src: "https://cdn.example.com/secret.m3u8" });
    const hostnames = new Set(["cdn.example.com"]);
    createAuthAwarePlugin({
      allowlist: [(url) => hostnames.has(new URL(url).hostname)],
    }).setup(player, makeHost());
    player.fire("ready", { duration: 100 });
    expect(player.commands.run).toHaveBeenCalledWith("hls:setWithCredentials", true);
  });

  it("string allowlist is literal prefix — trailing dot is part of the match (A12)", () => {
    // "https://api-gateway." as a literal prefix DOES match URLs that start
    // exactly with that (including the dot). But because the matcher uses
    // startsWith with no magic, it does NOT match "https://api-gatewayxxx/...".
    const matching = makePlayer({ src: "https://api-gateway.example.com/stream.m3u8" });
    createAuthAwarePlugin({ allowlist: ["https://api-gateway."] }).setup(matching, makeHost());
    matching.fire("ready", { duration: 100 });
    expect(matching.commands.run).toHaveBeenCalledWith("hls:setWithCredentials", true);

    const nonMatching = makePlayer({ src: "https://api-gatewayxxx.example.com/v.m3u8" });
    __resetTrailingDotWarnForTests(); // second plugin instance — let the warn fire again in its own test
    createAuthAwarePlugin({ allowlist: ["https://api-gateway."] }).setup(nonMatching, makeHost());
    nonMatching.fire("ready", { duration: 100 });
    expect(nonMatching.commands.run).not.toHaveBeenCalledWith("hls:setWithCredentials", true);
  });

  it("warns once when a string entry ends with '.' (A12 migration aid)", () => {
    __resetTrailingDotWarnForTests();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    // First instantiation — warn fires.
    createAuthAwarePlugin({ allowlist: ["https://api-gateway."] });
    expect(warn).toHaveBeenCalledTimes(1);
    // Second instantiation with the same mistake — guarded by module flag.
    createAuthAwarePlugin({ allowlist: ["https://another-gateway."] });
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
