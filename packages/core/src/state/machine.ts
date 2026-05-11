/**
 * Pure player state machine. Inputs are `(status, event)` and the output is
 * `(next, effects)`. The orchestrator (`createPlayer`) applies the effects
 * against the underlying `<video>` and the typed event bus; the reducer
 * itself never touches the DOM.
 *
 * Transition diagram lives in `docs/spec/architecture.md`.
 */

import { type PlayerError } from "../types/error.js";
import { type SourceDescriptor } from "../types/source.js";
import { type PlayerStatus } from "../types/state.js";

/** Inputs accepted by the reducer. */
export type MachineEvent =
  /** Caller asked to (re)load a source. `null` clears back to idle. */
  | { type: "setSource"; source: SourceDescriptor | null }
  /** The source loader signalled `loadedmetadata`. */
  | { type: "loaded" }
  /** Load failed (manifest 4xx/5xx, decode, unsupported). */
  | { type: "loadFailed"; error: PlayerError }
  /** Caller asked to play (or the native engine fired `play`). */
  | { type: "play" }
  /** Caller asked to pause (or the native engine fired `pause`). */
  | { type: "pause" }
  /** Native `ended`. */
  | { type: "ended" }
  /** Runtime failure during playback (network drop, decoder crash). */
  | { type: "runtimeError"; error: PlayerError }
  /** Caller asked to retry after `error`. */
  | { type: "retry" }
  /** Caller invoked `dispose`. Always wins. */
  | { type: "dispose" };

/** Side-effects produced by transitions, applied by the orchestrator. */
export type MachineEffect =
  | { type: "attachSource"; source: SourceDescriptor }
  | { type: "detachSource" }
  | { type: "mediaPlay" }
  | { type: "mediaPause" }
  | { type: "mediaSeek"; seconds: number }
  | { type: "clearError" }
  | { type: "setError"; error: PlayerError };

/** Reducer return shape. `effects` is always frozen for safety. */
export interface MachineResult {
  next: PlayerStatus;
  effects: readonly MachineEffect[];
}

/** Result with no transition and no effects. */
const STAY: Pick<MachineResult, "effects"> = { effects: Object.freeze([]) };

const noop = (status: PlayerStatus): MachineResult => ({ next: status, ...STAY });

/**
 * Run one step of the state machine.
 *
 * Invalid transitions return the current state with no effects (the reducer
 * is a total function — never throws). The orchestrator can decide whether
 * to surface a warning.
 */
export function reduce(status: PlayerStatus, event: MachineEvent): MachineResult {
  // `dispose` always wins from any state and is idempotent on `idle`.
  if (event.type === "dispose") {
    if (status === "idle") return noop("idle");
    return { next: "idle", effects: [{ type: "detachSource" }] };
  }

  switch (status) {
    case "idle":
      if (event.type === "setSource") {
        if (event.source === null) return noop("idle");
        return {
          next: "loading",
          effects: [{ type: "clearError" }, { type: "attachSource", source: event.source }],
        };
      }
      return noop("idle");

    case "loading":
      switch (event.type) {
        case "loaded":
          return noop("ready");
        case "loadFailed":
          return { next: "error", effects: [{ type: "setError", error: event.error }] };
        case "setSource":
          if (event.source === null) {
            return { next: "idle", effects: [{ type: "detachSource" }] };
          }
          return {
            next: "loading",
            effects: [
              { type: "detachSource" },
              { type: "clearError" },
              { type: "attachSource", source: event.source },
            ],
          };
        default:
          return noop("loading");
      }

    case "ready":
      switch (event.type) {
        case "play":
          return { next: "playing", effects: [{ type: "mediaPlay" }] };
        case "runtimeError":
          return { next: "error", effects: [{ type: "setError", error: event.error }] };
        case "setSource":
          if (event.source === null) {
            return { next: "idle", effects: [{ type: "detachSource" }] };
          }
          return {
            next: "loading",
            effects: [
              { type: "detachSource" },
              { type: "clearError" },
              { type: "attachSource", source: event.source },
            ],
          };
        default:
          return noop("ready");
      }

    case "playing":
      switch (event.type) {
        case "pause":
          return { next: "paused", effects: [{ type: "mediaPause" }] };
        case "ended":
          return noop("ended");
        case "runtimeError":
          return { next: "error", effects: [{ type: "setError", error: event.error }] };
        case "setSource":
          if (event.source === null) {
            return { next: "idle", effects: [{ type: "detachSource" }] };
          }
          return {
            next: "loading",
            effects: [
              { type: "detachSource" },
              { type: "clearError" },
              { type: "attachSource", source: event.source },
            ],
          };
        default:
          return noop("playing");
      }

    case "paused":
      switch (event.type) {
        case "play":
          return { next: "playing", effects: [{ type: "mediaPlay" }] };
        case "ended":
          return noop("ended");
        case "runtimeError":
          return { next: "error", effects: [{ type: "setError", error: event.error }] };
        case "setSource":
          if (event.source === null) {
            return { next: "idle", effects: [{ type: "detachSource" }] };
          }
          return {
            next: "loading",
            effects: [
              { type: "detachSource" },
              { type: "clearError" },
              { type: "attachSource", source: event.source },
            ],
          };
        default:
          return noop("paused");
      }

    case "ended":
      switch (event.type) {
        case "play":
          // Replay: seek to 0 then play.
          return {
            next: "playing",
            effects: [{ type: "mediaSeek", seconds: 0 }, { type: "mediaPlay" }],
          };
        case "setSource":
          if (event.source === null) {
            return { next: "idle", effects: [{ type: "detachSource" }] };
          }
          return {
            next: "loading",
            effects: [
              { type: "detachSource" },
              { type: "clearError" },
              { type: "attachSource", source: event.source },
            ],
          };
        default:
          return noop("ended");
      }

    case "error":
      switch (event.type) {
        case "retry": {
          // Retry only makes sense if we have a previously-attached source,
          // but the reducer is source-agnostic; the orchestrator passes a
          // fresh `setSource` after `retry`. We move to `loading` optimistically.
          return { next: "loading", effects: [{ type: "clearError" }] };
        }
        case "setSource":
          if (event.source === null) {
            return { next: "idle", effects: [{ type: "detachSource" }] };
          }
          return {
            next: "loading",
            effects: [
              { type: "detachSource" },
              { type: "clearError" },
              { type: "attachSource", source: event.source },
            ],
          };
        default:
          return noop("error");
      }

    default: {
      // Exhaustive guard — TS will complain if we add a status without
      // handling it here.
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
