import { describe, expect, it } from "vitest";

import { type PlayerState } from "../types/state.js";

import {
  selectActiveQuality,
  selectBufferedRanges,
  selectCurrentTime,
  selectDuration,
  selectIsPlaying,
  selectMuted,
  selectPlaybackRate,
  selectStatus,
  selectVolume,
} from "./selectors.js";

function makeState(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    status: "idle",
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
    ...overrides,
  };
}

describe("identity selectors", () => {
  it("returns the right scalar for each accessor", () => {
    const s = makeState({
      status: "playing",
      currentTime: 12.5,
      duration: 180,
      volume: 0.5,
      muted: true,
      playbackRate: 1.25,
    });
    expect(selectStatus(s)).toBe("playing");
    expect(selectCurrentTime(s)).toBe(12.5);
    expect(selectDuration(s)).toBe(180);
    expect(selectVolume(s)).toBe(0.5);
    expect(selectMuted(s)).toBe(true);
    expect(selectPlaybackRate(s)).toBe(1.25);
  });
});

describe("selectIsPlaying", () => {
  it("is true only for status=playing", () => {
    expect(selectIsPlaying(makeState({ status: "playing" }))).toBe(true);
    expect(selectIsPlaying(makeState({ status: "paused" }))).toBe(false);
    expect(selectIsPlaying(makeState({ status: "ready" }))).toBe(false);
    expect(selectIsPlaying(makeState({ status: "ended" }))).toBe(false);
    expect(selectIsPlaying(makeState({ status: "loading" }))).toBe(false);
    expect(selectIsPlaying(makeState({ status: "idle" }))).toBe(false);
    expect(selectIsPlaying(makeState({ status: "error" }))).toBe(false);
  });
});

describe("selectActiveQuality", () => {
  it("returns the active quality or null", () => {
    const q = { id: "1", height: 720, bitrate: 2500000, label: "720p" };
    expect(selectActiveQuality(makeState({ activeQuality: q }))).toBe(q);
    expect(selectActiveQuality(makeState())).toBeNull();
  });
});

describe("selectBufferedRanges (memoized)", () => {
  it("returns the same reference when contents are unchanged", () => {
    const r1 = selectBufferedRanges(makeState({ buffered: [{ start: 0, end: 5 }] }));
    const r2 = selectBufferedRanges(makeState({ buffered: [{ start: 0, end: 5 }] }));
    expect(r1).toBe(r2);
  });

  it("returns a new reference when start changes", () => {
    selectBufferedRanges(makeState({ buffered: [{ start: 0, end: 5 }] }));
    const r2 = selectBufferedRanges(makeState({ buffered: [{ start: 1, end: 5 }] }));
    selectBufferedRanges(makeState({ buffered: [{ start: 1, end: 5 }] }));
    expect(r2).toEqual([{ start: 1, end: 5 }]);
  });

  it("returns a new reference when length changes", () => {
    const a = selectBufferedRanges(makeState({ buffered: [{ start: 0, end: 5 }] }));
    const b = selectBufferedRanges(
      makeState({
        buffered: [
          { start: 0, end: 5 },
          { start: 10, end: 15 },
        ],
      }),
    );
    expect(b).not.toBe(a);
    expect(b).toHaveLength(2);
  });

  it("handles empty arrays", () => {
    const r = selectBufferedRanges(makeState({ buffered: [] }));
    expect(r).toEqual([]);
  });
});
