import { describe, expect, it } from "vitest";

import { createPlayer } from "../src/createPlayer.js";
import type { SourceProvider } from "../src/types/source.js";

const FRAMES_PER_SECOND = 60;
const DURATION_SECONDS = 60;
const FRAME_COUNT = FRAMES_PER_SECOND * DURATION_SECONDS;
const FRAME_BUDGET_MS = 1000 / FRAMES_PER_SECOND;
const MAX_STORE_OVERHEAD_MS_PER_FRAME = 1;

function readyProvider(): SourceProvider {
  return {
    name: "perf-ready",
    canHandle: () => true,
    createLoader: () => ({
      attach: () => Promise.resolve(),
      detach: () => undefined,
    }),
  };
}

function makeVideoClock(video: HTMLVideoElement): { setCurrentTime: (seconds: number) => void } {
  let currentTime = 0;

  Object.defineProperty(video, "currentTime", {
    configurable: true,
    get: () => currentTime,
  });
  Object.defineProperty(video, "duration", {
    configurable: true,
    get: () => DURATION_SECONDS,
  });
  Object.defineProperty(video, "buffered", {
    configurable: true,
    get: () =>
      ({
        length: 0,
        start: () => 0,
        end: () => 0,
      }) as unknown as TimeRanges,
  });

  return {
    setCurrentTime: (seconds) => {
      currentTime = seconds;
    },
  };
}

describe("timeupdate store throughput", () => {
  it("keeps 60fps timeupdate × 5 selector subscribers below the frame budget", async () => {
    const video = document.createElement("video");
    const clock = makeVideoClock(video);
    const selectorRuns: [number, number, number, number, number] = [0, 0, 0, 0, 0];
    let subscriberCalls = 0;
    let timeupdateEvents = 0;

    const player = createPlayer(
      { source: { src: "https://cdn.test/perf.mp4", type: "mp4" } },
      {
        extraProviders: [readyProvider()],
        storeOptions: { scheduleFlush: (run) => run() },
      },
    );

    await player.attach(video);
    video.dispatchEvent(new Event("loadedmetadata"));

    const disposers = [
      player.subscribe(
        (s) => {
          selectorRuns[0] += 1;
          return s.currentTime;
        },
        () => {
          subscriberCalls += 1;
        },
      ),
      player.subscribe(
        (s) => {
          selectorRuns[1] += 1;
          return Math.floor(s.currentTime);
        },
        () => {
          subscriberCalls += 1;
        },
      ),
      player.subscribe(
        (s) => {
          selectorRuns[2] += 1;
          return s.duration > 0 ? s.currentTime / s.duration : 0;
        },
        () => {
          subscriberCalls += 1;
        },
      ),
      player.subscribe(
        (s) => {
          selectorRuns[3] += 1;
          return s.buffered.length;
        },
        () => {
          subscriberCalls += 1;
        },
      ),
      player.subscribe(
        (s) => {
          selectorRuns[4] += 1;
          return s.source?.src ?? null;
        },
        () => {
          subscriberCalls += 1;
        },
      ),
    ];
    player.on("timeupdate", () => {
      timeupdateEvents += 1;
    });

    const startedAt = performance.now();
    for (let frame = 1; frame <= FRAME_COUNT; frame += 1) {
      clock.setCurrentTime(frame / FRAMES_PER_SECOND);
      video.dispatchEvent(new Event("timeupdate"));
    }
    const elapsedMs = performance.now() - startedAt;
    const msPerFrame = elapsedMs / FRAME_COUNT;
    const fpsCapacity = 1000 / msPerFrame;

    console.info(
      JSON.stringify({
        benchmark: "timeupdate-60fps-5-subscribers",
        frames: FRAME_COUNT,
        elapsedMs: Number(elapsedMs.toFixed(3)),
        msPerFrame: Number(msPerFrame.toFixed(4)),
        fpsCapacity: Math.round(fpsCapacity),
        selectorRuns: selectorRuns.reduce((sum, count) => sum + count, 0),
        subscriberCalls,
      }),
    );

    for (const dispose of disposers) dispose();
    player.dispose();

    expect(timeupdateEvents).toBe(FRAME_COUNT);
    expect(selectorRuns).toEqual(Array(5).fill(FRAME_COUNT + 1));
    expect(subscriberCalls).toBeGreaterThanOrEqual(FRAME_COUNT * 2);
    expect(msPerFrame).toBeLessThan(MAX_STORE_OVERHEAD_MS_PER_FRAME);
    expect(msPerFrame).toBeLessThan(FRAME_BUDGET_MS);
  });
});
