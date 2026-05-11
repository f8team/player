import { describe, expect, it, vi } from "vitest";

import { createMarkersPlugin } from "./markers.js";
import type { Player, PluginHost } from "@f8/player-core";

const MARKERS = [
  { time: 0, label: "Intro" },
  { time: 60, label: "Chapter 1" },
  { time: 120, label: "Chapter 2" },
];

function makePlayer(): Player {
  return {
    seekTo: vi.fn(),
    getState: vi.fn(), on: vi.fn().mockReturnValue(() => undefined),
    subscribe: vi.fn().mockReturnValue(() => undefined),
    commands: { add: vi.fn().mockReturnValue(() => undefined), run: vi.fn(), has: vi.fn() },
    play: vi.fn(), pause: vi.fn(), paused: vi.fn(), setPlaybackRate: vi.fn(),
    setVolume: vi.fn(), setMuted: vi.fn(), setSource: vi.fn(), getSource: vi.fn(),
    getCurrentTime: vi.fn(), getDuration: vi.fn(), getBuffered: vi.fn(), off: vi.fn(),
    attach: vi.fn(), detach: vi.fn(), dispose: vi.fn(), use: vi.fn(), removePlugin: vi.fn(),
  } as unknown as Player;
}

function makeHost(): PluginHost & { _run: (cmd: string, p?: unknown) => void } {
  const cmds: Record<string, (p: unknown) => void> = {};
  return {
    controls: { contribute: vi.fn().mockReturnValue(() => undefined) },
    commands: {
      add: vi.fn().mockImplementation((name: string, h: (p: unknown) => void) => {
        cmds[name] = h;
        return () => { delete cmds[name]; };
      }),
      run: vi.fn().mockImplementation((name: string, p?: unknown) => cmds[name]?.(p)),
      has: vi.fn(),
    },
    store: { getState: vi.fn(), subscribe: vi.fn().mockReturnValue(() => undefined) },
    emit: vi.fn(),
    _run: (cmd: string, p?: unknown) => cmds[cmd]?.(p as unknown),
  };
}

describe("createMarkersPlugin", () => {
  it("has name 'markers'", () => {
    expect(createMarkersPlugin().name).toBe("markers");
  });

  it("emits markers:changed on setup when markers are provided", () => {
    const host = makeHost();
    createMarkersPlugin({ markers: MARKERS }).setup(makePlayer(), host);
    expect(host.emit).toHaveBeenCalledWith("markers:changed", MARKERS);
  });

  it("does not emit on setup when no initial markers", () => {
    const host = makeHost();
    createMarkersPlugin().setup(makePlayer(), host);
    expect(host.emit).not.toHaveBeenCalled();
  });

  it("markers:setMarkers replaces markers and emits changed", () => {
    const host = makeHost();
    createMarkersPlugin().setup(makePlayer(), host);
    const newMarkers = [{ time: 10, label: "New" }];
    host._run("markers:setMarkers", newMarkers);
    expect(host.emit).toHaveBeenCalledWith("markers:changed", newMarkers);
  });

  it("markers:seekTo by index seeks to marker time and emits click", () => {
    const player = makePlayer();
    const host = makeHost();
    createMarkersPlugin({ markers: MARKERS }).setup(player, host);
    host._run("markers:seekTo", 1); // index 1 = 60s
    expect(player.seekTo).toHaveBeenCalledWith(60);
    expect(host.emit).toHaveBeenCalledWith("markers:click", MARKERS[1]);
  });

  it("markers:seekTo by time finds nearest marker", () => {
    const player = makePlayer();
    const host = makeHost();
    createMarkersPlugin({ markers: MARKERS }).setup(player, host);
    host._run("markers:seekTo", 65); // nearest to 65s is index 1 (60s)
    expect(player.seekTo).toHaveBeenCalledWith(60);
  });

  it("teardown disposes commands", () => {
    const plugin = createMarkersPlugin({ markers: MARKERS });
    const teardown = plugin.setup(makePlayer(), makeHost());
    expect(() => teardown?.()).not.toThrow();
  });
});
