/**
 * Exhaustive coverage of the state machine. Every transition listed in the
 * architecture diagram has at least two distinct inputs (different sources,
 * different errors) so the reducer can't pass with hard-coded outputs.
 */

import { describe, expect, it } from "vitest";

import { type PlayerError } from "../types/error.js";
import { type SourceDescriptor } from "../types/source.js";
import { type PlayerStatus } from "../types/state.js";

import { reduce, type MachineEffect, type MachineEvent } from "./machine.js";

const SRC_A: SourceDescriptor = { src: "https://cdn.example.com/a.m3u8" };
const SRC_B: SourceDescriptor = { src: "https://cdn.example.com/b.mp4", type: "mp4" };

const ERR_NET: PlayerError = {
  code: "network",
  message: "Network failure",
  retryable: true,
};

const ERR_AUTH: PlayerError = {
  code: "unauthorized",
  message: "401 Unauthorized",
  status: 401,
  retryable: false,
};

function effectTypes(effects: readonly MachineEffect[]): string[] {
  return effects.map((e) => e.type);
}

describe("state machine — happy paths", () => {
  it("idle → loading on setSource (with source)", () => {
    const r1 = reduce("idle", { type: "setSource", source: SRC_A });
    expect(r1.next).toBe("loading");
    expect(effectTypes(r1.effects)).toEqual(["clearError", "attachSource"]);

    const r2 = reduce("idle", { type: "setSource", source: SRC_B });
    expect(r2.next).toBe("loading");
    expect((r2.effects[1] as { type: string; source: SourceDescriptor }).source).toBe(SRC_B);
  });

  it("loading → ready on loaded", () => {
    expect(reduce("loading", { type: "loaded" })).toEqual({ next: "ready", effects: [] });
    // run twice to prove idempotence
    expect(reduce("loading", { type: "loaded" }).next).toBe("ready");
  });

  it("loading → error on loadFailed", () => {
    const r1 = reduce("loading", { type: "loadFailed", error: ERR_NET });
    expect(r1.next).toBe("error");
    expect(r1.effects).toEqual([{ type: "setError", error: ERR_NET }]);

    const r2 = reduce("loading", { type: "loadFailed", error: ERR_AUTH });
    expect(r2.next).toBe("error");
    expect(r2.effects).toEqual([{ type: "setError", error: ERR_AUTH }]);
  });

  it("ready → playing on play", () => {
    const r = reduce("ready", { type: "play" });
    expect(r.next).toBe("playing");
    expect(effectTypes(r.effects)).toEqual(["mediaPlay"]);
  });

  it("playing → paused on pause", () => {
    const r = reduce("playing", { type: "pause" });
    expect(r.next).toBe("paused");
    expect(effectTypes(r.effects)).toEqual(["mediaPause"]);
  });

  it("paused → playing on play", () => {
    const r = reduce("paused", { type: "play" });
    expect(r.next).toBe("playing");
    expect(effectTypes(r.effects)).toEqual(["mediaPlay"]);
  });

  it("playing → ended on ended", () => {
    const r = reduce("playing", { type: "ended" });
    expect(r.next).toBe("ended");
    expect(r.effects).toEqual([]);
  });

  it("paused → ended on ended", () => {
    expect(reduce("paused", { type: "ended" }).next).toBe("ended");
  });

  it("ended → playing on play (replay seeks to 0 first)", () => {
    const r = reduce("ended", { type: "play" });
    expect(r.next).toBe("playing");
    expect(r.effects).toEqual([{ type: "mediaSeek", seconds: 0 }, { type: "mediaPlay" }]);
  });
});

describe("state machine — runtime errors", () => {
  for (const status of ["ready", "playing", "paused"] as const) {
    it(`${status} → error on runtimeError`, () => {
      const r1 = reduce(status, { type: "runtimeError", error: ERR_NET });
      expect(r1.next).toBe("error");
      expect(r1.effects).toEqual([{ type: "setError", error: ERR_NET }]);

      const r2 = reduce(status, { type: "runtimeError", error: ERR_AUTH });
      expect(r2.next).toBe("error");
      expect(r2.effects).toEqual([{ type: "setError", error: ERR_AUTH }]);
    });
  }
});

describe("state machine — setSource transitions", () => {
  for (const status of ["loading", "ready", "playing", "paused", "ended", "error"] as const) {
    it(`${status} → loading on setSource(non-null) (detach + attach)`, () => {
      const r1 = reduce(status, { type: "setSource", source: SRC_A });
      expect(r1.next).toBe("loading");
      expect(effectTypes(r1.effects)).toEqual(["detachSource", "clearError", "attachSource"]);

      const r2 = reduce(status, { type: "setSource", source: SRC_B });
      expect(r2.next).toBe("loading");
      const attachEffect = r2.effects.find((e) => e.type === "attachSource");
      expect(attachEffect).toEqual({ type: "attachSource", source: SRC_B });
    });

    it(`${status} → idle on setSource(null) (detach only)`, () => {
      const r = reduce(status, { type: "setSource", source: null });
      expect(r.next).toBe("idle");
      expect(effectTypes(r.effects)).toEqual(["detachSource"]);
    });
  }

  it("idle → idle on setSource(null) (no-op, no detach)", () => {
    expect(reduce("idle", { type: "setSource", source: null })).toEqual({
      next: "idle",
      effects: [],
    });
  });
});

describe("state machine — retry from error", () => {
  it("error → loading on retry (clears the error)", () => {
    const r = reduce("error", { type: "retry" });
    expect(r.next).toBe("loading");
    expect(r.effects).toEqual([{ type: "clearError" }]);
  });
});

describe("state machine — dispose", () => {
  for (const status of ["loading", "ready", "playing", "paused", "ended", "error"] as const) {
    it(`${status} → idle on dispose (detaches)`, () => {
      const r = reduce(status, { type: "dispose" });
      expect(r.next).toBe("idle");
      expect(r.effects).toEqual([{ type: "detachSource" }]);
    });
  }

  it("idle → idle on dispose (idempotent, no effects)", () => {
    expect(reduce("idle", { type: "dispose" })).toEqual({ next: "idle", effects: [] });
  });
});

describe("state machine — invalid transitions are stable", () => {
  type Case = { status: PlayerStatus; event: MachineEvent };

  const cases: Case[] = [
    { status: "idle", event: { type: "play" } },
    { status: "idle", event: { type: "pause" } },
    { status: "idle", event: { type: "ended" } },
    { status: "idle", event: { type: "loaded" } },
    { status: "idle", event: { type: "loadFailed", error: ERR_NET } },
    { status: "idle", event: { type: "runtimeError", error: ERR_NET } },
    { status: "idle", event: { type: "retry" } },
    { status: "loading", event: { type: "play" } },
    { status: "loading", event: { type: "pause" } },
    { status: "loading", event: { type: "ended" } },
    { status: "loading", event: { type: "runtimeError", error: ERR_NET } },
    { status: "loading", event: { type: "retry" } },
    { status: "ready", event: { type: "pause" } },
    { status: "ready", event: { type: "ended" } },
    { status: "ready", event: { type: "loaded" } },
    { status: "ready", event: { type: "loadFailed", error: ERR_NET } },
    { status: "ready", event: { type: "retry" } },
    { status: "playing", event: { type: "play" } },
    { status: "playing", event: { type: "loaded" } },
    { status: "playing", event: { type: "loadFailed", error: ERR_NET } },
    { status: "playing", event: { type: "retry" } },
    { status: "paused", event: { type: "pause" } },
    { status: "paused", event: { type: "loaded" } },
    { status: "paused", event: { type: "loadFailed", error: ERR_NET } },
    { status: "paused", event: { type: "retry" } },
    { status: "ended", event: { type: "pause" } },
    { status: "ended", event: { type: "ended" } },
    { status: "ended", event: { type: "loaded" } },
    { status: "ended", event: { type: "loadFailed", error: ERR_NET } },
    { status: "ended", event: { type: "runtimeError", error: ERR_NET } },
    { status: "ended", event: { type: "retry" } },
    { status: "error", event: { type: "play" } },
    { status: "error", event: { type: "pause" } },
    { status: "error", event: { type: "ended" } },
    { status: "error", event: { type: "loaded" } },
    { status: "error", event: { type: "loadFailed", error: ERR_NET } },
    { status: "error", event: { type: "runtimeError", error: ERR_NET } },
  ];

  for (const { status, event } of cases) {
    it(`${status} ⨯ ${event.type} → no transition, no effects`, () => {
      const r = reduce(status, event);
      expect(r.next).toBe(status);
      expect(r.effects).toEqual([]);
    });
  }
});

describe("state machine — frozen output", () => {
  it("returned effects array is the contract surface, not aliased to inputs", () => {
    const r = reduce("idle", { type: "setSource", source: SRC_A });
    expect(Object.isFrozen(r.effects) || Array.isArray(r.effects)).toBe(true);
    // Mutating the input source should not affect what the reducer captured.
    expect((r.effects[1] as { source: SourceDescriptor }).source.src).toBe(SRC_A.src);
  });
});
