# @f8/player-react

## 1.0.0

### Minor Changes

- b8ac150: # 2026-05-12 senior review fixes

  Round of corrections from a senior review of the f8-player monorepo. Mostly
  production-robustness fixes, plus a small set of additive public-API changes
  and a couple of breaking visual defaults to make the package cleanly
  publishable as OSS.

  ## Public API additions (minor)
  - **`@f8/player-core`** — `Player.retry(): boolean` re-attempts the last
    source. Returns `false` when there is nothing to retry. Useful for
    "Try again" buttons on error overlays.
  - **`@f8/player-core`** — `SourceLoader.abort?()` (optional) lets the
    orchestrator cancel in-flight network work on rapid `setSource` swaps
    without tearing down the underlying media element. Both built-in HLS and
    YouTube loaders implement it.
  - **`@f8/player-react`** — `<Player.Root labels>` prop + `defaultLabels` /
    `vietnameseLabels` presets + `useLabels()` hook for ARIA / time-formatter
    i18n.
  - **`@f8/player-plugin-resume-position`** — `keyFn(source) => string | null`
    (signed-URL-friendly), `saveIntervalMs` (default 10s, periodic save while
    playing).
  - **`@f8/player-plugin-auth-aware`** — `allowlist` now accepts
    `string | RegExp | (url: string) => boolean` per entry; new
    `AuthAwareAllowlistEntry` exported type.
  - **`@f8/player-themes`** — `f8-brand.css` opt-in layer for F8 orange
    branding on top of any base theme.

  ## Production robustness (patch + minor)
  - **HLS** — listener-leak fix on per-segment XHRs; manifest-load timeout
    (default 30s) so a stalled manifest doesn't pin the player in `loading`;
    non-fatal HTTP 4xx/5xx now surface as load errors; native fallback path
    cleans up listeners on early `detach()`.
  - **YouTube** — bridges polled `getCurrentTime` / `getDuration` into the
    core store and event bus (seek bars and time-aware plugins now tick on
    YouTube sources); marks the underlying `<video>` via the
    `data-f8-player-yt-hidden` attribute instead of mutating inline styles
    (host CSS no longer fights the loader); warns once when the player's
    parent is `position: static`.
  - **createPlayer** — autoplay / startTime no longer leak listeners across
    re-attach cycles, and re-attach to an already-`ready` player now applies
    them synchronously instead of waiting for a transition that already fired.
  - **plugin-keyboard** — fixes container-scope fallback; skips `contenteditable`
    regions, `role="textbox"`, and IME composition (no more accidental Space
    toggles while typing in a rich-text editor).
  - **plugin-resume-position** — SSR-safe (no-op when `window` is undefined);
    also saves on `pagehide` / `visibilitychange→hidden` for iOS Safari, plus
    periodic save while playing.
  - **plugin-auth-aware** — emits a one-time console warning when a string
    allowlist entry ends with `.`, to surface a class of consumer mistakes
    (`"https://api-gateway."` literal vs `/^https:\/\/api-gateway\./` regex).

  ## Breaking changes (visual / OSS posture)
  - **`@f8/player-react` default ARIA labels are English.** F8 apps that need
    Vietnamese must pass `labels={vietnameseLabels}` to `<Player.Root>`. Time
    labels are now functions of the formatted string so locales can frame the
    output (`"Current time 1:23"` vs `"Vị trí hiện tại: 1:23"`). The
    `vietnameseLabels` preset matches the previous hardcoded strings byte for
    byte, so adopting it produces the exact same screenshots.
  - **`@f8/player-themes` default accent is neutral blue (`#3b82f6`).** F8
    brand orange now lives in the opt-in `f8-brand.css` layer:

    ```ts
    import "@f8/player-themes/classroom.css";
    import "@f8/player-themes/f8-brand.css"; // F8 only
    ```

  - **`@f8/player-themes` selectors are scoped exclusively under
    `[data-f8-player][data-theme="X"]`.** The `.f8-player-X` fallback class
    was removed to prevent style leakage onto host pages with the same
    generic class names. Use the data-attribute selector or the
    `<Player.Root>` adapter (which sets it for you).
  - **SeekBar wrapper changed.** The component now renders
    `<div data-f8p-seek-wrapper>` containing a `<div data-f8p-seek-buffered>`
    overlay and the range input. Custom CSS that targeted the bare
    `<input type="range">` directly may need to add `data-f8p-seek-wrapper`
    to its selectors to keep alignment.

  ## UX details
  - Mobile breakpoint (`@media (pointer: coarse), (max-width: 48rem)`) bumps
    every theme's button to ≥ 4.4rem (44px) and enlarges the seek bar thumb
    for tap accuracy.
  - `:focus-visible` ring restored on every theme's range thumb (previously
    `outline: none` with no replacement).
  - Every theme respects `prefers-reduced-motion: reduce`.
  - Documented z-index contract via `--f8p-z-buffered`, `--f8p-z-controls`,
    `--f8p-z-watermark`, `--f8p-z-overlay`. Host modals should pick z-index
    ≥ 30 to safely overlay the player.

  ## Migration notes for F8 consumers
  - **f8-ui:** delete `src/shims/reactPlayerHls.ts` + the
    `declare module "react-player"` block in `vendor-modules.d.ts` (already
    done). Pass `vietnameseLabels` to `<Player.Root>` if you want Vietnamese
    ARIA. Import `@f8/player-themes/f8-brand.css` after a base theme to
    re-apply the F8 orange.
  - **f8-dash-ui:** drop the invalid `enableVolumeScroll` argument from
    `createKeyboardPlugin` (already done). Use the `RegExp` form for
    `auth-aware` allowlist (already done).

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
  - @f8/player-core@1.0.0
