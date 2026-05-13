/**
 * `createPlayer(options)` — wires every piece of `@f8/player-core` into a
 * single `Player`. The factory is the one and only public entry point.
 *
 * Responsibilities:
 *   1. Build the reactive store seeded with the initial PlayerOptions.
 *   2. Build the event bus, command registry, controls registry, plugin bus.
 *   3. Register the always-on native source provider (and HLS / YouTube
 *      providers with callbacks bound to this player's store and bus).
 *   4. Bridge `<video>` events ⇄ the state-machine reducer.
 *   5. Apply machine effects (attach/detach source, mediaPlay/Pause/Seek,
 *      clearError/setError) against the live `<video>` element.
 *   6. Expose the `Player` interface defined in
 *      `docs/spec/api-contract.md`.
 *
 * Tests live next to this file and validate the external behavior; lower-level
 * pieces (store, machine, sources, plugins, etc.) are covered by their own
 * unit tests.
 */

import { classifyMediaError, classifyUnknown } from "./errors/classify.js";
import { createPlayerError } from "./errors/registry.js";
import { createEventBus, type EventBus } from "./events/bus.js";
import { createPluginBus, type PluginBus } from "./plugins/bus.js";
import { createCommandRegistry } from "./plugins/commands.js";
import { createControlsRegistry, createPluginHost } from "./plugins/host.js";
import { createHlsProvider } from "./sources/hls.js";
import { nativeProvider } from "./sources/native.js";
import { createSourceRegistry, type SourceRegistry } from "./sources/registry.js";
import { createYouTubeProvider } from "./sources/youtube.js";
import { reduce, type MachineEffect, type MachineEvent } from "./state/machine.js";
import { createStore, type CreateStoreOptions } from "./state/store.js";
import { type PlayerError } from "./types/error.js";
import { type PlayerEvents, type UnauthorizedEvent } from "./types/events.js";
import { type PlayerOptions } from "./types/options.js";
import { type Disposer, type Player } from "./types/player.js";
import { type PluginInstance } from "./types/plugin.js";
import {
  type QualityLevel,
  type SourceDescriptor,
  type SourceLoader,
  type SourceProvider,
} from "./types/source.js";
import { type BufferedRange, type PlayerState, type PlayerStatus } from "./types/state.js";

/** @internal — extra knobs surfaced for tests and adapters. */
export interface CreatePlayerInternalOptions {
  /** Override the microtask scheduler for the store. Tests use this. */
  storeOptions?: CreateStoreOptions<PlayerState>;
  /** Inject extra source providers (e.g. dash, in-house DRM). */
  extraProviders?: SourceProvider[];
}

const NATIVE_EVENTS = [
  "loadedmetadata",
  "durationchange",
  "timeupdate",
  "play",
  "pause",
  "ended",
  "error",
  "volumechange",
  "ratechange",
  "seeking",
  "seeked",
  "waiting",
  "playing",
] as const;

function makeInitialState(options: PlayerOptions): PlayerState {
  return {
    status: "idle",
    source: options.source ?? null,
    currentTime: 0,
    duration: 0,
    buffered: [],
    playbackRate: options.playbackRate ?? 1,
    volume: options.volume ?? 1,
    muted: options.muted ?? options.autoplay === "muted",
    videoWidth: 0,
    videoHeight: 0,
    pip: false,
    fullscreen: false,
    qualities: [],
    activeQuality: null,
    error: null,
  };
}

function bufferedToRanges(buffered: TimeRanges | null | undefined): BufferedRange[] {
  if (!buffered) return [];
  const out: BufferedRange[] = [];
  for (let i = 0; i < buffered.length; i++) {
    out.push({ start: buffered.start(i), end: buffered.end(i) });
  }
  return out;
}

/**
 * Build a fresh `Player`. Safe to construct in the browser, jsdom, or
 * server-rendering tests (only `attach()` touches the DOM).
 */
export function createPlayer(
  options: PlayerOptions = {},
  internal: CreatePlayerInternalOptions = {},
): Player {
  /* ---------------------------------------------------------------- */
  /* State                                                             */
  /* ---------------------------------------------------------------- */

  const store = createStore<PlayerState>(makeInitialState(options), internal.storeOptions);
  const bus: EventBus = createEventBus();
  const commands = createCommandRegistry();
  const controls = createControlsRegistry();

  let status: PlayerStatus = "idle";
  let video: HTMLVideoElement | null = null;
  let activeLoader: SourceLoader | null = null;
  let pendingAttachAbort: (() => void) | null = null;
  let disposed = false;
  let initialOptionsApplied = false;
  // Tracks a `play()` call that arrived while the engine is still in the
  // `loading` state (HLS manifest, native metadata). The state machine
  // intentionally treats `play` as a noop in `loading`, so we queue the
  // intent here and re-dispatch on the next `ready` transition. Without
  // this, the very first user click on the play button is silently
  // swallowed and the user has to click twice for HLS sources.
  let pendingPlay = false;

  /* ---------------------------------------------------------------- */
  /* Source registry                                                   */
  /* ---------------------------------------------------------------- */

  const registry: SourceRegistry = createSourceRegistry();

  function emitUnauthorized(payload: UnauthorizedEvent): void {
    bus.emit("unauthorized", payload);
    options.hooks?.onUnauthorized?.(payload);
  }

  function applyError(err: PlayerError): void {
    store.setState({ error: err });
    bus.emit("error", err);
    options.hooks?.onError?.(err);
  }

  function setQualities(qualities: QualityLevel[]): void {
    store.setState({ qualities });
  }

  function setActiveQuality(quality: QualityLevel | null, auto: boolean): void {
    store.setState({ activeQuality: quality });
    bus.emit("qualitychange", { quality, auto });
  }

  // Built-in command: hls-quality plugin delegates to this via
  // player.commands.run("hls:setQuality", level).
  commands.add("hls:setQuality", (level: unknown) => {
    const loader = activeLoader as { setQuality?: (l: QualityLevel | "auto") => void } | null;
    if (typeof loader?.setQuality === "function") {
      loader.setQuality(level === null ? "auto" : (level as QualityLevel));
    }
  });

  // Order matters: extra providers win first so consumers (and tests) can
  // override the built-ins without unregistering them.
  for (const provider of internal.extraProviders ?? []) registry.register(provider);
  registry.register(
    createHlsProvider({
      onUnauthorized: (e) => emitUnauthorized(e),
      onQualities: (q) => setQualities(q),
      onActiveQuality: (q, auto) => setActiveQuality(q, auto),
      onError: (err) => applyError(createPlayerError({ ...err, code: "network" })),
      onQualitySwitch: (active) => bus.emit("qualityswitch", { active }),
    }),
  );
  registry.register(
    createYouTubeProvider({
      onError: (err) => applyError(createPlayerError({ ...err, code: "source" })),
      // Bridge YouTube's polled time/duration into the same store fields and
      // bus events that hls.js / native engines populate. Without this, the
      // seek bar, transcripts, resume-position and analytics plugins would
      // never tick on YouTube sources (A3).
      onTimeUpdate: (currentTime) => {
        const duration = store.getState().duration;
        store.setState({ currentTime });
        bus.emit("timeupdate", { currentTime, playedSeconds: currentTime, duration });
      },
      onDuration: (duration) => {
        store.setState({ duration });
        bus.emit("durationchange", { duration });
      },
    }),
  );
  registry.register(nativeProvider);

  /* ---------------------------------------------------------------- */
  /* Player object (forward declaration so plugins can capture a ref)  */
  /* ---------------------------------------------------------------- */

  const playerRef = {} as Player;
  const host = createPluginHost({
    commands,
    controls,
    store: { getState: store.getState, subscribe: store.subscribe },
    bus,
  });
  const plugins: PluginBus = createPluginBus({ player: playerRef, host });

  /* ---------------------------------------------------------------- */
  /* Reducer wiring                                                    */
  /* ---------------------------------------------------------------- */

  function dispatch(event: MachineEvent): void {
    if (disposed) return;
    const prev = status;
    const result = reduce(status, event);
    status = result.next;
    store.setState({ status });
    for (const effect of result.effects) applyEffect(effect);
    if (prev !== "ready" && status === "ready") {
      bus.emit("ready", { duration: store.getState().duration });
    }
  }

  function applyEffect(effect: MachineEffect): void {
    switch (effect.type) {
      case "attachSource":
        runAttachSource(effect.source);
        return;
      case "detachSource":
        runDetachSource();
        return;
      case "mediaPlay":
        runMediaPlay();
        return;
      case "mediaPause":
        runMediaPause();
        return;
      case "mediaSeek":
        runMediaSeek(effect.seconds);
        return;
      case "clearError":
        if (store.getState().error) store.setState({ error: null });
        return;
      case "setError":
        applyError(effect.error);
        return;
      default: {
        const _exhaustive: never = effect;
        return _exhaustive;
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* Effect runners                                                    */
  /* ---------------------------------------------------------------- */

  function runAttachSource(source: SourceDescriptor): void {
    // Cancel any prior in-flight loader BEFORE we replace activeLoader so a
    // rapid setSource(A) → setSource(B) sequence cannot let A's resolved
    // metadata leak into B's state. detach() will be invoked by the next
    // detachSource effect (state machine emits detachSource before
    // attachSource on every source switch).
    pendingAttachAbort?.();
    pendingAttachAbort = null;

    store.setState({ source, currentTime: 0, duration: 0, buffered: [], qualities: [] });
    if (!video) return; // attach happens once a <video> is provided
    const provider = registry.resolve(source);
    if (!provider) {
      dispatch({
        type: "loadFailed",
        error: createPlayerError({
          code: "unsupported",
          message: `No source provider for ${source.src}`,
        }),
      });
      return;
    }
    const loader = provider.createLoader();
    activeLoader = loader;

    let aborted = false;
    pendingAttachAbort = () => {
      aborted = true;
      // Tell the loader to cancel its in-flight network work. The loader
      // implementation is responsible for being idempotent and safe across
      // detach() ordering (see SourceLoader.abort docstring).
      try {
        loader.abort?.();
      } catch (err) {
        console.error("[@f8/player-core] loader.abort() threw:", err);
      }
    };

    loader
      .attach(video, source)
      .then(() => {
        if (aborted) return;
        if (!video) return;
        // Capture metadata into the store; the native `loadedmetadata`
        // event listener will also have fired, but plugins-with-mock-engines
        // (HLS native fallback, YouTube) can resolve `attach` later.
        store.setState({
          duration: Number.isFinite(video.duration) ? video.duration : 0,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          buffered: bufferedToRanges(video.buffered),
        });
        dispatch({ type: "loaded" });
      })
      .catch((err) => {
        if (aborted) return;
        const playerError = classifyUnknown(err, source.src);
        dispatch({ type: "loadFailed", error: playerError });
      });
  }

  function runDetachSource(): void {
    pendingAttachAbort?.();
    pendingAttachAbort = null;
    if (activeLoader) {
      try {
        activeLoader.detach();
      } catch (err) {
        console.error("[@f8/player-core] active loader detach threw:", err);
      }
      activeLoader = null;
    }
    store.setState({
      source: null,
      duration: 0,
      currentTime: 0,
      buffered: [],
      qualities: [],
      activeQuality: null,
    });
  }

  function runMediaPlay(): void {
    if (!video) return;
    const result = video.play();
    if (result && typeof (result as Promise<void>).then === "function") {
      (result as Promise<void>).catch((err: unknown) => {
        dispatch({
          type: "runtimeError",
          error: classifyUnknown(err),
        });
      });
    }
  }

  function runMediaPause(): void {
    if (!video) return;
    try {
      video.pause();
    } catch {
      // ignore
    }
  }

  function runMediaSeek(seconds: number): void {
    if (!video) return;
    try {
      video.currentTime = seconds;
    } catch {
      // ignore
    }
  }

  /* ---------------------------------------------------------------- */
  /* Native <video> event bridge                                       */
  /* ---------------------------------------------------------------- */

  const nativeListeners: Array<() => void> = [];

  function bindNativeEvents(target: HTMLVideoElement): void {
    function on<T extends Event>(name: string, fn: (e: T) => void): void {
      const handler = (e: Event): void => fn(e as T);
      target.addEventListener(name, handler);
      nativeListeners.push(() => target.removeEventListener(name, handler));
    }
    for (const _ of NATIVE_EVENTS) {
      // listed for documentation; bound below explicitly
      void _;
    }

    on("loadedmetadata", () => {
      store.setState({
        duration: Number.isFinite(target.duration) ? target.duration : 0,
        videoWidth: target.videoWidth,
        videoHeight: target.videoHeight,
        buffered: bufferedToRanges(target.buffered),
      });
      // The state machine will also receive `loaded` from the loader;
      // calling dispatch here is safe because invalid transitions are no-ops.
      if (status === "loading") dispatch({ type: "loaded" });
    });
    on("durationchange", () => {
      const duration = Number.isFinite(target.duration) ? target.duration : 0;
      store.setState({ duration });
      bus.emit("durationchange", { duration });
    });
    on("timeupdate", () => {
      const currentTime = target.currentTime;
      store.setState({ currentTime, buffered: bufferedToRanges(target.buffered) });
      bus.emit("timeupdate", {
        currentTime,
        playedSeconds: currentTime,
        duration: target.duration,
      });
    });
    on("play", () => {
      bus.emit("play");
      dispatch({ type: "play" });
    });
    on("pause", () => {
      bus.emit("pause");
      dispatch({ type: "pause" });
    });
    on("ended", () => {
      bus.emit("ended");
      dispatch({ type: "ended" });
    });
    on("error", () => {
      const err = classifyMediaError(target.error, target.currentSrc);
      if (status === "loading") dispatch({ type: "loadFailed", error: err });
      else dispatch({ type: "runtimeError", error: err });
    });
    on("volumechange", () => {
      store.setState({ volume: target.volume, muted: target.muted });
      bus.emit("volumechange", { volume: target.volume, muted: target.muted });
    });
    on("ratechange", () => {
      store.setState({ playbackRate: target.playbackRate });
      bus.emit("ratechange", { playbackRate: target.playbackRate });
    });
    on("seeking", () => {
      bus.emit("seeking", { time: target.currentTime });
      // Seeking flushes the decode pipeline; show the same center spinner as
      // `waiting` until `seeked` / `playing` settles (avoids a "frozen" feel).
      bus.emit("buffering", { isBuffering: true });
    });
    on("seeked", () => {
      bus.emit("seeked", { time: target.currentTime });
      // Paused scrubs: nothing will fire `playing` to clear the seek spinner.
      if (target.paused) {
        bus.emit("buffering", { isBuffering: false });
        return;
      }
      // Playing: if the browser already has enough decoded data, clear early;
      // otherwise keep showing until `waiting` → `playing` (or `playing` alone).
      if (target.readyState >= 3 /* HAVE_FUTURE_DATA */) {
        bus.emit("buffering", { isBuffering: false });
      }
    });
    on("waiting", () => {
      bus.emit("buffering", { isBuffering: true });
    });
    on("playing", () => {
      bus.emit("buffering", { isBuffering: false });
    });

    // `fullscreenchange` fires on `document`, not on the <video> element.
    // We track it here so `state.fullscreen` stays accurate without requiring
    // consumers to install the fullscreen plugin.
    if (typeof document !== "undefined") {
      const onFullscreenChange = (): void => {
        const isFullscreen = !!document.fullscreenElement;
        store.setState({ fullscreen: isFullscreen });
        bus.emit("fullscreenchange", { fullscreen: isFullscreen });
      };
      document.addEventListener("fullscreenchange", onFullscreenChange);
      nativeListeners.push(() =>
        document.removeEventListener("fullscreenchange", onFullscreenChange),
      );
    }
  }

  function unbindNativeEvents(): void {
    while (nativeListeners.length) {
      try {
        nativeListeners.pop()?.();
      } catch {
        // ignore
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* Public Player                                                     */
  /* ---------------------------------------------------------------- */

  function applyInitialOptions(): void {
    if (initialOptionsApplied || !video) return;
    if (typeof options.volume === "number") video.volume = options.volume;
    if (typeof options.muted === "boolean") video.muted = options.muted;
    if (typeof options.playbackRate === "number") video.playbackRate = options.playbackRate;
    if (options.poster) video.poster = options.poster;
    if (options.preload) video.preload = options.preload;
    if (options.playsInline ?? true) {
      video.playsInline = true;
      video.setAttribute("webkit-playsinline", "");
    }
    if (options.crossOrigin) video.crossOrigin = options.crossOrigin;
    if (options.loop) video.loop = true;
    initialOptionsApplied = true;
  }

  // Per-attach disposers (autoplay / startTime listeners + post-ready
  // immediate work) so that re-attach after detach doesn't leak listeners
  // and does fire autoplay/startTime even when the player is already in
  // the `ready` state on the second attach (A5).
  const attachDisposers: Array<() => void> = [];

  function flushAttachDisposers(): void {
    while (attachDisposers.length) {
      try {
        attachDisposers.pop()?.();
      } catch {
        // ignore
      }
    }
  }

  function applyStartTimeNow(): void {
    if (video && typeof options.startTime === "number" && options.startTime > 0) {
      video.currentTime = options.startTime;
    }
  }

  function applyAutoplayNow(): void {
    if (!options.autoplay || options.autoplay === "off") return;
    if (options.autoplay === "muted" && video) video.muted = true;
    playerRef.play().catch(() => {
      /* swallow — surfaced via runtimeError */
    });
  }

  async function attach(el: HTMLVideoElement): Promise<void> {
    if (disposed) throw new Error("[@f8/player-core] cannot attach: player disposed");
    if (video === el) return;
    if (video) detach();
    video = el;
    bindNativeEvents(el);
    applyInitialOptions();
    if (options.source) dispatch({ type: "setSource", source: options.source });

    const wantStartTime = typeof options.startTime === "number" && options.startTime > 0;
    const wantAutoplay = !!options.autoplay && options.autoplay !== "off" && !!options.source;

    // If the engine has already reached ready (e.g. second attach to the
    // same already-loaded source), apply autoplay/startTime synchronously
    // so the second mount behaves identically to the first.
    if (status === "ready") {
      if (wantStartTime) applyStartTimeNow();
      if (wantAutoplay) applyAutoplayNow();
    } else {
      if (wantStartTime) {
        const off = bus.on("ready", () => {
          applyStartTimeNow();
          off();
        });
        attachDisposers.push(off);
      }
      if (wantAutoplay) {
        const off = bus.on("ready", () => {
          applyAutoplayNow();
          off();
        });
        attachDisposers.push(off);
      }
    }
  }

  function detach(): void {
    pendingAttachAbort?.();
    pendingAttachAbort = null;
    flushAttachDisposers();
    unbindNativeEvents();
    if (activeLoader) {
      try {
        activeLoader.detach();
      } catch {
        // ignore
      }
      activeLoader = null;
    }
    video = null;
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    plugins.disposeAll();
    dispatch({ type: "dispose" });
    detach();
    bus.clear();
    controls.clear();
    store.dispose();
  }

  function setSource(source: SourceDescriptor | null): void {
    // Cancel any queued play intent so a play() issued during the previous
    // load doesn't auto-fire on the new source's `ready` event.
    pendingPlay = false;
    dispatch({ type: "setSource", source });
  }

  function getSource(): SourceDescriptor | null {
    return store.getState().source;
  }

  // Retry replays the most recent source through the state machine. We do
  // this at the orchestrator layer (rather than inside the reducer) because
  // the reducer is pure and the source is owned by the store. Calling
  // `setSource(currentSource)` re-emits detachSource → clearError →
  // attachSource which gives us the same cycle as a fresh load (C1).
  function retry(): boolean {
    const current = store.getState().source;
    if (!current) return false;
    dispatch({ type: "setSource", source: current });
    return true;
  }

  async function play(): Promise<void> {
    if (disposed) throw new Error("[@f8/player-core] cannot play: player disposed");
    if (!video) throw new Error("[@f8/player-core] cannot play: no <video> attached");
    if (!store.getState().source) throw new Error("[@f8/player-core] cannot play: no source set");

    // In `error`, `dispatch({ type: "play" })` is intentionally a reducer noop — user
    // Space/Play would appear dead. Replay the descriptor through the machine like `retry()`
    // so we return to loading and defer until `ready`.
    if (status === "error") {
      pendingPlay = false;
      if (!retry()) {
        throw new Error("[@f8/player-core] cannot play: error state without replayable source");
      }
      // retry() transitioned to loading synchronously via dispatch.
    }

    // Defer-play during loading: the state machine treats `play` as a noop
    // in `loading`, so a single user click would otherwise be lost while
    // HLS.js is still fetching the m3u8 manifest. Queue the intent and
    // re-dispatch on the next `ready` transition. Tied to attach lifecycle
    // via `attachDisposers` so detach/dispose cancels the queued play.
    if (status === "loading") {
      if (pendingPlay) {
        return;
      }
      pendingPlay = true;
      const off = bus.on("ready", () => {
        off();
        if (!pendingPlay) return;
        pendingPlay = false;
        if (disposed || !video || !store.getState().source) return;
        dispatch({ type: "play" });
      });
      attachDisposers.push(() => {
        pendingPlay = false;
        off();
      });
      return;
    }

    dispatch({ type: "play" });
    // If the underlying engine returned a play() promise, the runner already
    // surfaced its rejection through dispatch(runtimeError).
  }

  function pause(): void {
    // Cancel any queued play intent so explicitly pausing during loading
    // doesn't autoplay once `ready` fires.
    pendingPlay = false;
    dispatch({ type: "pause" });
  }

  function paused(): boolean {
    if (!video) return true;
    return video.paused;
  }

  function seekTo(seconds: number): void {
    if (!Number.isFinite(seconds)) return;
    if (!video) return;
    const duration = Number.isFinite(video.duration) ? video.duration : Number.POSITIVE_INFINITY;
    const clamped = Math.max(0, Math.min(seconds, duration));
    video.currentTime = clamped;
  }

  function syncVolumeMutedStoreFromVideo(): void {
    if (!video) return;
    store.setState({ volume: video.volume, muted: video.muted });
  }

  function syncPlaybackRateStoreFromVideo(): void {
    if (!video) return;
    store.setState({ playbackRate: video.playbackRate });
  }

  function setPlaybackRate(rate: number): void {
    if (!Number.isFinite(rate) || rate <= 0) return;
    if (!video) return;
    video.playbackRate = rate;
    syncPlaybackRateStoreFromVideo();
  }

  function setVolume(volume: number): void {
    if (!Number.isFinite(volume)) return;
    if (!video) return;
    video.volume = Math.max(0, Math.min(1, volume));
    syncVolumeMutedStoreFromVideo();
  }

  function setMuted(muted: boolean): void {
    if (!video) return;
    video.muted = muted;
    syncVolumeMutedStoreFromVideo();
  }

  function getState(): PlayerState {
    return store.getState();
  }

  function getCurrentTime(): number {
    return store.getState().currentTime;
  }

  function getDuration(): number {
    return store.getState().duration;
  }

  function getBuffered(): BufferedRange[] {
    return store.getState().buffered.slice();
  }

  function on<K extends keyof PlayerEvents>(
    event: K,
    handler: (payload: PlayerEvents[K]) => void,
  ): Disposer {
    return bus.on(event, handler as never);
  }

  function off<K extends keyof PlayerEvents>(
    event: K,
    handler: (payload: PlayerEvents[K]) => void,
  ): void {
    bus.off(event, handler as never);
  }

  function subscribe<T>(
    selector: (state: PlayerState) => T,
    listener: (value: T) => void,
  ): Disposer {
    return store.subscribe(selector, listener);
  }

  function use(plugin: PluginInstance): void {
    plugins.register(plugin);
  }

  function removePlugin(name: string): void {
    plugins.unregister(name);
  }

  // Materialize the public surface on the existing reference so plugins
  // captured a stable identity at construction time.
  Object.assign(playerRef, {
    setSource,
    getSource,
    retry,
    play,
    pause,
    paused,
    seekTo,
    setPlaybackRate,
    setVolume,
    setMuted,
    getState,
    getCurrentTime,
    getDuration,
    getBuffered,
    on,
    off,
    subscribe,
    use,
    removePlugin,
    commands,
    attach,
    detach,
    dispose,
  } satisfies Player);

  // Pre-register plugins from PlayerOptions.
  for (const plugin of options.plugins ?? []) plugins.register(plugin);

  return playerRef;
}
