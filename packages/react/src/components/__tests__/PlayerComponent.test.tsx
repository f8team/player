import { createPlayer } from "@f8/player-core";
import { act, render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { PlayerComponent as Player, type PlayerHandle } from "../PlayerComponent.js";

vi.mock("@f8/player-core", async () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await vi.importActual<typeof import("@f8/player-core")>("@f8/player-core");
  const state = {
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
  const mock = {
    getState: () => state,
    getSource: () => null,
    getCurrentTime: () => 0,
    getDuration: () => 0,
    getBuffered: () => [],
    subscribe: vi.fn().mockReturnValue(() => undefined),
    on: vi.fn().mockReturnValue(() => undefined),
    off: vi.fn(),
    attach: vi.fn().mockResolvedValue(undefined),
    detach: vi.fn(),
    dispose: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    paused: vi.fn().mockReturnValue(true),
    seekTo: vi.fn(),
    setPlaybackRate: vi.fn(),
    setVolume: vi.fn(),
    setMuted: vi.fn(),
    setSource: vi.fn(),
    use: vi.fn(),
    removePlugin: vi.fn(),
    commands: { run: vi.fn().mockResolvedValue(undefined), add: vi.fn(), has: vi.fn() },
  };
  return {
    ...actual,
    createPlayer: vi.fn(() => mock),
  };
});

describe("<Player> one-liner", () => {
  it("renders a <video> element", () => {
    const { container } = render(<Player options={{ muted: true }} />);
    expect(container.querySelector("video")).not.toBeNull();
  });

  it("renders the controls bar with toolbar role by default", () => {
    render(<Player />);
    const toolbar = document.querySelector("[role='toolbar']");
    expect(toolbar).not.toBeNull();
  });

  it("hides controls bar when controls=false", () => {
    render(<Player controls={false} />);
    expect(document.querySelector("[role='toolbar']")).toBeNull();
  });

  it("exposes a PlayerHandle via ref", async () => {
    const ref = createRef<PlayerHandle>();
    render(<Player ref={ref} />);
    await act(async () => undefined);
    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.play).toBe("function");
    expect(typeof ref.current?.pause).toBe("function");
    expect(typeof ref.current?.paused).toBe("function");
    expect(typeof ref.current?.seekTo).toBe("function");
    expect(typeof ref.current?.restore).toBe("function");
    expect(ref.current?.raw).toBeDefined();
  });

  it("PlayerHandle.play() delegates to player.play()", async () => {
    const ref = createRef<PlayerHandle>();
    render(<Player ref={ref} />);
    await act(async () => undefined);
    await ref.current!.play();
    const player = (createPlayer as ReturnType<typeof vi.fn>).mock.results.at(-1)?.value;
    expect(player.play).toHaveBeenCalled();
  });

  it("PlayerHandle.pause() delegates to player.pause()", async () => {
    const ref = createRef<PlayerHandle>();
    render(<Player ref={ref} />);
    await act(async () => undefined);
    ref.current!.pause();
    const player = (createPlayer as ReturnType<typeof vi.fn>).mock.results.at(-1)?.value;
    expect(player.pause).toHaveBeenCalled();
  });

  it("PlayerHandle.restore() seeks to last paused position then plays", async () => {
    const ref = createRef<PlayerHandle>();
    render(<Player ref={ref} />);
    await act(async () => undefined);
    const player = (createPlayer as ReturnType<typeof vi.fn>).mock.results.at(-1)?.value;
    // Simulate pause at time 30.
    player.getCurrentTime = vi.fn().mockReturnValue(30);
    ref.current!.pause();
    await ref.current!.restore();
    expect(player.seekTo).toHaveBeenCalledWith(30);
    expect(player.play).toHaveBeenCalled();
  });
});
