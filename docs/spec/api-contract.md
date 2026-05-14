# Public API contract — frozen at Phase 0

This contract is the public surface of `@f8team/reel-core` and `@f8team/reel-react`. Phases 1–3 implement against it; phases 4–5 migrate F8 surfaces against it; phase 6+ document and ship it.

Any change to a public type in this file is a **breaking change** unless explicitly marked `@internal` or covered by a feature flag.

## `@f8team/reel-core`

### Lifecycle

```ts
import { createPlayer, type PlayerOptions, type Player } from "@f8team/reel-core";

const player: Player = createPlayer(options: PlayerOptions);
await player.attach(videoElement: HTMLVideoElement): Promise<void>;
player.detach(): void;
player.dispose(): void;       // attach → detach → release plugins → drop store subscribers
```

### `PlayerOptions`

```ts
interface PlayerOptions {
  source?: SourceDescriptor; // initial source; can be set later via setSource()
  autoplay?: AutoplayMode; // 'off' (default) | 'muted' | 'on'
  startTime?: number; // seconds; applied on first ready
  loop?: boolean;
  muted?: boolean;
  volume?: number; // 0..1
  playbackRate?: number;
  poster?: string;
  preload?: "auto" | "metadata" | "none";
  playsInline?: boolean; // default true; required for iOS
  crossOrigin?: "anonymous" | "use-credentials" | null;
  plugins?: PluginInstance[];
  theme?: ThemeName | ThemeTokens;
  hooks?: PlayerHooks;
  /** Block built-in keyboard handlers; used when the consumer owns its own chrome. */
  keyboard?: { scope?: "global" | "container" | "off" };
}

type AutoplayMode = "off" | "muted" | "on";

interface SourceDescriptor {
  src: string;
  type?: "auto" | "hls" | "mp4" | "youtube" | "dash" | "native";
  /** Hint used to short-circuit the source registry. */
  withCredentials?: boolean | ((url: string) => boolean);
  /** Subtitle tracks to attach to the underlying <video>. */
  tracks?: SubtitleTrack[];
}

interface SubtitleTrack {
  src: string;
  srcLang: string; // BCP-47, e.g. "vi", "en"
  label: string;
  default?: boolean;
}

interface PlayerHooks {
  /** Fires once per source when an HLS XHR ends with 401 or 403. */
  onUnauthorized?: (event: UnauthorizedEvent) => void;
  /** Fires for every error (transport, decode, source). */
  onError?: (error: PlayerError) => void;
}
```

### Methods

```ts
interface Player {
  // Source control
  setSource(source: SourceDescriptor | null): void;
  getSource(): SourceDescriptor | null;

  // Playback
  play(): Promise<void>;
  pause(): void;
  paused(): boolean;
  seekTo(seconds: number): void;
  setPlaybackRate(rate: number): void;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;

  // State (snapshot reads; reactive subscriptions go through .subscribe())
  getState(): PlayerState;
  getCurrentTime(): number;
  getDuration(): number;
  getBuffered(): TimeRanges;

  // Reactive
  on<K extends keyof PlayerEvents>(
    event: K,
    handler: (payload: PlayerEvents[K]) => void,
  ): () => void;
  off<K extends keyof PlayerEvents>(event: K, handler: (payload: PlayerEvents[K]) => void): void;
  subscribe<T>(selector: (state: PlayerState) => T, listener: (value: T) => void): () => void;

  // Plugins / commands
  use(plugin: PluginInstance): void;
  removePlugin(name: string): void;
  commands: CommandRegistry;

  // Lifecycle
  attach(el: HTMLVideoElement): Promise<void>;
  detach(): void;
  dispose(): void;
}
```

### `PlayerState`

```ts
interface PlayerState {
  status: "idle" | "loading" | "ready" | "playing" | "paused" | "ended" | "error";
  source: SourceDescriptor | null;
  currentTime: number;
  duration: number;
  buffered: { start: number; end: number }[];
  playbackRate: number;
  volume: number;
  muted: boolean;
  videoWidth: number;
  videoHeight: number;
  pip: boolean;
  fullscreen: boolean;
  qualities: QualityLevel[];
  activeQuality: QualityLevel | null;
  error: PlayerError | null;
}

interface QualityLevel {
  id: string;
  height: number;
  bitrate: number;
  label: string;
}

interface PlayerError {
  code: "source" | "network" | "decode" | "unauthorized" | "unsupported" | "internal";
  message: string;
  cause?: unknown;
  status?: number; // for HTTP errors
  url?: string;
  retryable: boolean;
}
```

### Events

```ts
interface PlayerEvents {
  ready: { duration: number };
  play: void;
  pause: void;
  ended: void;
  timeupdate: { currentTime: number; playedSeconds: number; duration: number };
  durationchange: { duration: number };
  ratechange: { playbackRate: number };
  volumechange: { volume: number; muted: boolean };
  seeking: { time: number };
  seeked: { time: number };
  buffering: { isBuffering: boolean }; // `waiting`/`playing`; also tied to seeking for center-spinner UX
  qualitychange: { quality: QualityLevel | null; auto: boolean };
  qualitieswitch: { active: boolean };
  error: PlayerError;
  unauthorized: UnauthorizedEvent;
  fullscreenchange: { fullscreen: boolean };
  pipchange: { pip: boolean };
  /** Plugins can emit custom namespaced events: `subtitles:change`, `markers:hover`, ... */
  [k: `${string}:${string}`]: any;
}

interface UnauthorizedEvent {
  url: string;
  status: 401 | 403;
  source: SourceDescriptor;
}
```

### Plugins

```ts
interface PluginInstance {
  readonly name: string;
  setup(player: Player, host: PluginHost): void | (() => void);
}

interface PluginHost {
  controls: {
    /** Plugins can contribute UI fragments to slots like `seekbar.overlay`, `menu.settings`. */
    contribute(slot: string, render: () => Element): () => void;
  };
  commands: CommandRegistry;
  store: ReadableStore<PlayerState>;
  emit<K extends string>(event: K, payload?: unknown): void;
}

interface CommandRegistry {
  add<P = void>(name: string, handler: (payload: P) => void): () => void;
  run<P = void>(name: string, payload?: P): void;
  has(name: string): boolean;
}

declare function definePlugin(spec: {
  name: string;
  setup: (player: Player, host: PluginHost) => void | (() => void);
}): PluginInstance;
```

### Source registry

```ts
interface SourceLoader {
  attach(video: HTMLVideoElement, source: SourceDescriptor): Promise<void>;
  detach(): void;
  getQualities?(): QualityLevel[];
  setQuality?(level: QualityLevel | "auto"): void;
}

interface SourceProvider {
  name: string;
  canHandle(source: SourceDescriptor): boolean | "maybe";
  createLoader(): SourceLoader;
}

declare function registerSource(provider: SourceProvider): void;
declare function unregisterSource(name: string): void;
```

## `@f8team/reel-react`

### Components

```tsx
// One-liner — wraps Root + Video + Captions + Controls.Bar with a default theme.
<Player
  src={url}
  source={source}
  theme="classroom"
  subtitles={tracks}
  onProgress={handler}
  onEnded={handler}
  onUnauthorized={handler}
  ref={ref}
/>;

// Composable — Radix-style.
<Player.Root source={source} plugins={[hlsQuality(), markers({...})]}>
  <Player.Video poster={poster} />
  <Player.Captions />
  <Player.Controls.Bar>
    <Player.Controls.PlayPause />
    <Player.Controls.SeekBar />
    <Player.Controls.Time format="elapsed/total" />
    <Player.Controls.Volume />
    <Player.Controls.Quality />
    <Player.Controls.PlaybackRate />
    <Player.Controls.Captions />
    <Player.Controls.Pip />
    <Player.Controls.Fullscreen />
  </Player.Controls.Bar>
</Player.Root>;
```

### Hooks

```ts
function usePlayer(): Player;
function usePlayerState<T>(selector: (state: PlayerState) => T): T;
function usePlayerEvent<K extends keyof PlayerEvents>(
  event: K,
  handler: (payload: PlayerEvents[K]) => void,
): void;
```

### Imperative ref (back-compat)

```ts
type PlayerHandle = {
  play(): void;
  pause(): void;
  paused(): boolean;
  seekTo(seconds: number): void;
  restore(): void;
  /** Escape hatch: get the underlying core Player instance. */
  raw(): Player;
};
```

The legacy `f8-ui` `VideoPlayerHandle` and the legacy `f8-dash-ui` ref API both
shape-conform to this. `restore()` is preserved.

## Stability tiers

- **Stable** (semver-protected): everything above.
- **Experimental** (clearly marked `@experimental` in TSDoc): plugins still in beta.
- **Internal** (`@internal`): anything in `core/internal/**` and adapter `_*` exports.
