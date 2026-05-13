# @f8/player-preset-web

## 1.0.0

### Minor Changes

- # DX flexibility improvements (Phase 2–9)

  ## `@f8/player-react` — callback props + plugin commands + i18n
  - **`useCallbackProps(player, props)`** — new hook that maps `onPlay / onPause /
onEnded / onError / onReady / onProgress / onQualityChange / onUnauthorized`
    callback props onto the player event bus. Each callback is held in a ref, so
    subscribers never re-register when prop identity changes. Replaces the
    hand-rolled `EventBridge` component consumers previously had to write.
  - **`usePluginCommand(player, pluginName, command, ...args)`** — new hook that
    sends an ad-hoc command to a named plugin from a React component without
    importing the plugin package directly.
  - **`PlayerCallbackProps`** — new exported interface; use it to forward event
    callbacks through component trees without repeating the union type.
  - **i18n** — `defaultLabels`, `vietnameseLabels`, `useLabels()`,
    `PlayerLabels` are now part of the public API. Pass `labels` to
    `<Player.Root>` (or `<F8WebPlayer>`) to override every ARIA string and the
    time-formatter; `vietnameseLabels` reproduces the previous hardcoded
    Vietnamese strings byte for byte.

  ## `@f8/player-plugin-prefs` — new public API

  Complete API overhaul replacing the implicit `localStorage` singleton:
  - **`createPrefsPlugin(options?)`** — factory that accepts `PrefsPluginOptions`.
  - **`PrefsPluginOptions`** — `storageKey`, `lockVolume`, `lockMuted`,
    `lockPlaybackRate`, `lockQualityHeight`, `restoreOnReady`.
  - **`PlayerPrefs`** — exported shape for the persisted object
    (`volume`, `muted`, `playbackRate`, `qualityHeight`, `captionsLang`).
  - SSR-safe (no-op when `window` is undefined).

  ## `@f8/player-preset-web` — factory bundles for F8 web apps

  New package exposing three consumption patterns:
  - **`createF8WebPlayerPlugins(opts?)`** — returns a ready-to-use plugin list
    (`F8WebPlayerPluginsOptions`). Use with your own `createPlayer` call.
  - **`<F8WebPlayer>`** (React) — one-liner React component with all F8 web
    plugins pre-wired (`F8WebPlayerProps`, `F8WebPlayerLight`).
  - **`<f8-web-player>` / `defineF8WebPlayer()`** (Lit) — one-liner custom
    element for Lit / vanilla HTML (`F8WebPlayerElement`).
  - Re-exports `vietnameseLabels`, `defaultLabels`, `PlayerLabels`,
    `PlayerCallbackProps` from `@f8/player-react` so consumers have a single
    import point.

  ## `@f8/player-themes` — headless CSS layer
  - **`headless.css`** — new opt-in layer with zero visual opinion: structural
    layout only (flex, positioning, z-index contract). Use it as a base when
    building fully custom themes from scratch without importing any of the
    opinionated colour/sizing rules from `classroom.css` or similar.

### Patch Changes

- Updated dependencies [b8ac150]
- Updated dependencies
  - @f8/player-core@1.0.0
  - @f8/player-react@1.0.0
  - @f8/player-lit@1.0.0
  - @f8/player-plugin-keyboard@1.0.0
  - @f8/player-plugin-auth-aware@1.0.0
  - @f8/player-plugin-prefs@1.0.0
  - @f8/player-plugin-fullscreen@1.0.0
  - @f8/player-plugin-hls-quality@1.0.0
  - @f8/player-plugin-markers@1.0.0
  - @f8/player-plugin-pip@1.0.0
  - @f8/player-plugin-subtitles@1.0.0
  - @f8/player-plugin-thumbnails@1.0.0
