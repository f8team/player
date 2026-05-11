# Plan — `f8-player`

> Phased, MD-driven plan. Resume rule: open the file, find the first phase with
> any `[ ]` todo, continue from the first unchecked item. Check `[x]` immediately
> when each todo finishes — never batch.

**Status:** Phase 0 complete. Phase 1 ready.

## Phase 0 — Discovery & spec freeze [DONE]

- [x] Audit `f8-ui` and `f8-dash-ui` video usage; lock the 16 golden cases.
- [x] Bootstrap monorepo (pnpm + Turbo + TS strict + ESLint flat + Prettier + Vitest).
- [x] Lock public API in `docs/spec/api-contract.md`.
- [x] Lock architecture in `docs/spec/architecture.md` (state machine, layout, lazy loading, budgets).
- [x] Write a11y, perf, security specs.
- [x] Capture decisions in `docs/spec/adr/0001..0003`.
- [x] Write README, CONTRIBUTING, CHANGELOG, CODE_OF_CONDUCT, SECURITY.

**Exit gate:** `pnpm install && pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` passes (no source code yet — root scripts and shared configs).

---

## Phase 1 — `@f8/player-core` (headless engine)

Goal: ship the headless engine that every adapter and plugin compiles against. **No DOM beyond `HTMLMediaElement`. No framework.**

### 1.A — Package skeleton

- [ ] Create `packages/core/package.json` with `name: "@f8/player-core"`, `type: "module"`, `exports`, `files`, `sideEffects: false`, build/test scripts.
- [ ] `packages/core/tsconfig.json` extending the root.
- [ ] `packages/core/vitest.config.ts` (jsdom env for `HTMLMediaElement`-touching tests; node env elsewhere).
- [ ] `packages/core/.size-limit.json` with the 12/15 KB gzip threshold.
- [ ] Add `tsup` (or `unbuild`) for ESM + CJS + d.ts output; verify `dist/` shape.

### 1.B — Types & contracts

- [ ] `src/types/index.ts` re-exports the public types from `docs/spec/api-contract.md` (`PlayerOptions`, `Player`, `PlayerState`, `PlayerEvents`, `SourceDescriptor`, `SubtitleTrack`, `QualityLevel`, `PlayerError`, `PluginInstance`, `PluginHost`, `SourceProvider`, `SourceLoader`).
- [ ] Each type has a TSDoc with the matching golden-case reference (G1..G16).

### 1.C — State machine

- [ ] `src/state/machine.ts`: pure reducer `(status, event) => { next, effects }`.
- [ ] Tests: every transition listed in `docs/spec/architecture.md` is covered by a unit test (≥2 inputs each).
- [ ] Tests: invalid transitions (e.g., `play` from `idle` without a source) return the same state with no side effects.

### 1.D — Reactive store

- [ ] `src/state/store.ts`: `createStore<T>` with `getState`, `setState`, `subscribe(selector, listener)`, `dispose()`. Microtask-batched updates.
- [ ] `src/state/selectors.ts`: memoized selectors for `currentTime`, `isPlaying`, `activeQuality`, `bufferedRanges`.
- [ ] Tests: subscribers fire only when their selected slice changes; `dispose` removes every subscriber; batch coalesces multiple `setState` in one tick.

### 1.E — Event bus

- [ ] `src/events/bus.ts`: `createEventBus<TEvents>()` with typed `on`, `off`, `emit`. Custom plugin events (`subtitles:change`) are typed as `${string}:${string}`.
- [ ] Tests: listener removal during emit does not skip remaining listeners; throw in one listener does not abort others (errors logged).

### 1.F — Source registry

- [ ] `src/sources/registry.ts`: register/unregister, `resolve(source)` returns the best provider.
- [ ] `src/sources/native.ts`: always-on provider for MP4/WebM/blob/data URLs. Sets `<video>.src`, listens for `error`/`loadedmetadata`/`canplay`.
- [ ] `src/sources/hls.ts`: lazy `import("hls.js")`, wires `xhrSetup` for `withCredentials` (callback) and surfaces 401/403 through the `unauthorized` event.
- [ ] `src/sources/youtube.ts`: lazy IFrame API loader; constructs an off-DOM iframe behind the player container and bridges `play / pause / seekTo / time` to the core.
- [ ] `src/util/url.ts`: `looksLikeHls(url)`, `detectSourceType(source)`. Tests for each detector with ≥3 fixtures.

### 1.G — Plugin bus

- [ ] `src/plugins/bus.ts`: `register(plugin)`, `unregister(name)`, `disposeAll()`. Each plugin gets a `PluginHost`.
- [ ] `src/plugins/host.ts`: `controls.contribute(slot, render)`, `commands.add/run/has`, `store` (read-only), `emit`.
- [ ] `src/plugins/definePlugin.ts`: identity helper for type narrowing.
- [ ] Tests: plugin teardown is invoked on `player.dispose()`; commands registered through the host are namespaced; double-register throws.

### 1.H — `createPlayer`

- [ ] `src/createPlayer.ts`: wires the state machine + store + event bus + source registry + plugin bus into a `Player`. Implements `attach`, `detach`, `dispose`, `play`, `pause`, `paused`, `seekTo`, `setSource`, `setPlaybackRate`, `setVolume`, `setMuted`, `getState`, `getCurrentTime`, `getDuration`, `getBuffered`.
- [ ] `attach(video)` wires `<video>` events (`play`, `pause`, `timeupdate`, `seeking`, `seeked`, `ended`, `volumechange`, `ratechange`, `error`, `waiting`, `playing`, `loadedmetadata`) to the state machine.
- [ ] Tests: characterization fixtures replicate the golden cases that do not need a live engine (G1 keyboard skipped — keyboard plugin owns it; G13 unauthorized 401 simulated through a mock HLS provider; G14 force-HLS resolved through `looksLikeHls + isIOSWebKit`; G16 keyboard scope toggle).

### 1.I — Errors

- [ ] `src/errors/registry.ts`: `PlayerError` class with code/message/cause/status/url/retryable.
- [ ] `src/errors/classify.ts`: maps `MediaError.code` and `XMLHttpRequest.status` to a `PlayerError`.

### 1.J — A11y model

- [ ] `src/a11y/announce.ts`: writes to a shared off-screen live region (single instance per page).
- [ ] `src/a11y/focusTrap.ts`: minimal focus trap helper used by adapters in fullscreen.

### 1.K — Theme tokens

- [ ] `src/theme/tokens.ts`: TypeScript description of every CSS variable.
- [ ] `src/theme/apply.ts`: writes tokens to a container's `style` (used by adapters for runtime overrides).

### 1.L — Utility helpers

- [ ] `src/util/time.ts`: `parseTime("00:01:23") => number`, `formatTime(seconds) => string`.
- [ ] `src/util/promise.ts`: `withTimeout`, `oncePerKey`.

### 1.M — Tests gate

- [ ] Vitest coverage ≥95% statements, ≥90% branches.
- [ ] `pnpm -C packages/core size` passes the 12/15 KB threshold.
- [ ] Lint, typecheck, format checks all green.

**Exit gate:** `pnpm verify && pnpm -C packages/core size`.

**Suggested model for Phase 1:** Claude Opus 4.7 High — heaviest TS rigor, state-machine correctness, plugin lifecycle invariants. Phase 1 is the foundation; do not skimp.

---

## Phase 2 — `@f8/player-react` (React adapter)

Goal: thin React layer over the core. Composable Slot API + one-liner + back-compat ref.

### 2.A — Package skeleton

- [ ] `packages/react/package.json` with `peerDependencies: { react: ">=18", react-dom: ">=18" }`, `exports`, `sideEffects: false`.
- [ ] tsup build for ESM/CJS/d.ts.
- [ ] `.size-limit.json` with the 4/5 KB threshold.

### 2.B — Provider & hooks

- [ ] `<Player.Root>` provider: instantiates `createPlayer`, attaches on mount, disposes on unmount, exposes via Context.
- [ ] `usePlayer()`, `usePlayerState(selector)`, `usePlayerEvent(event, handler)`. Tests: `usePlayerState` re-renders only when the selected slice changes.

### 2.C — Primitives

- [ ] `<Player.Video />` renders the `<video>` and wires `attach` on the ref.
- [ ] `<Player.Captions />` mounts `<track>` per `state.source.tracks`.
- [ ] `<Player.Controls.Bar>` is a flex container with theme classes.
- [ ] Each control (`PlayPause`, `SeekBar`, `Time`, `Volume`, `Quality`, `PlaybackRate`, `Captions`, `Pip`, `Fullscreen`) renders a real `<button>` / `<input>` with the ARIA mapping in `docs/spec/a11y.md`.

### 2.D — One-liner & ref

- [ ] `<Player>` flattens common props into `<Root><Video /><Captions /><Controls.Bar>...</Controls.Bar></Root>`.
- [ ] `forwardRef` exposes the `PlayerHandle` (play/pause/paused/seekTo/restore/raw).
- [ ] `restore()` resumes whatever playback state was captured on the most recent `pause()` (back-compat with the F8 `VideoPlayerHandle.restore`).

### 2.E — Tests gate

- [ ] Testing Library + jsdom: render each control, assert ARIA, simulate events.
- [ ] Coverage ≥90%.

**Exit gate:** `pnpm verify && pnpm -C packages/react size`.

**Suggested model for Phase 2:** Claude Sonnet 4.6 High — React idioms and ARIA, no architectural heavy lifting.

---

## Phase 3 — Themes + plugins

For each plugin:

- [ ] `packages/plugin-<name>/` skeleton (package.json, tsconfig, tsup, size-limit, vitest).
- [ ] `src/index.ts` exporting the factory.
- [ ] Unit tests + integration test against a mock `Player`.
- [ ] Storybook story (Phase 6 hooks into these).

Plugins to ship:

- [ ] `subtitles` — VTT, multi-language, default-language priority (G1, G15).
- [ ] `hls-quality` — quality menu, auto/manual switch (G7).
- [ ] `markers` — chapters/transcripts, click-to-seek, hover tooltip (G8, G9).
- [ ] `keyboard` — Space, ±5/±10 seconds, F fullscreen, scoped (G1, G7, G16).
- [ ] `touch-gestures` — tap-to-seek, double-tap, hold-to-pause (G2).
- [ ] `resume-position` — store last position per source; resume on attach.
- [ ] `auth-aware` — `withCredentials` allowlist + 401/403 callback (G13).
- [ ] `story-gestures` — story-specific tap/hold/double-tap reactions (G2).
- [ ] `safari-mp4-fallback` — desktop Safari + upload type → native MP4 path (G4).
- [ ] `analytics` — `play`, `pause`, `progress`, `ended`, custom events through a sink callback.
- [ ] `pip` — Picture-in-Picture toggle.
- [ ] `watermark` — premium overlay (Phase 8 wires the license check).

Themes to ship:

- [ ] `classroom.css` — course learning (G1, G3).
- [ ] `story.css` — full-bleed (G2).
- [ ] `admin.css` — editor with markers (G7, G8, G9, G10, G11).
- [ ] `minimal.css` — landing/hero (G6).

**Exit gate:** every plugin has its size-limit, every theme has its size-limit, all tests green.

**Suggested model for Phase 3:** Claude Sonnet 4.6 Medium — mostly mechanical, with periodic Opus checkpoints if a plugin grows tricky (markers + story-gestures may warrant Opus).

---

## Phase 4 — Migrate `f8-ui`

- [ ] **Characterization tests first**: pin the keyboard, `blockSpaceToggle`, `onStreamUnauthorized`, subtitle default selection, Safari escape, and story callbacks against the existing component (run with `react-player` still in place, then again after swap — both must pass).
- [ ] Add `@f8/player-react` + theme/plugin deps to `f8-ui/package.json` (workspace `file:` link or local pack).
- [ ] Replace [`src/components/VideoPlayer/index.tsx`](../../f8-ui/src/components/VideoPlayer/index.tsx) with a thin wrapper around `@f8/player-react`. Preserve `VideoPlayerHandle` and `SubtitleTrack` exports.
- [ ] Wire `theme="story"` for [`StoryViewerStage.tsx`](../../f8-ui/src/components/StoryViewer/StoryViewerStage.tsx) (or detect via `controls === false && playsinline`).
- [ ] Move Safari fallback into the `safari-mp4-fallback` plugin; remove the branch from [`PreviewCourse.tsx`](../../f8-ui/src/pages/CourseDetail/components/PreviewCourse/PreviewCourse.tsx).
- [ ] Remove `react-player`, `hls.js`, [`src/shims/reactPlayerHls.ts`](../../f8-ui/src/shims/reactPlayerHls.ts), [`src/types/vendor-modules.d.ts`](../../f8-ui/src/types/vendor-modules.d.ts).
- [ ] Run `f8-ui` test suite; manual smoke pass on Learning, Story, Video detail, Course preview.
- [ ] Bundle measurement before/after.

**Exit gate:** `pnpm test` in `f8-ui` and characterization pinning suite both green; bundle size delta documented.

**Suggested model for Phase 4:** Claude Sonnet 4.6 Medium.

---

## Phase 5 — Migrate `f8-dash-ui`

- [ ] Characterization tests for [`VideoUploadPreview`](../../f8-dash-ui/src/components/VideoUploadPreview/index.jsx) (markers click-seek, hotkeys, hls quality, playback rates, YouTube tech, blob, withCredentials gateway).
- [ ] Replace [`packages/f8-youtube-player`](../../f8-dash-ui/src/packages/f8-youtube-player/VideoPlayer.jsx) with a re-export shim around `@f8/player-react` + theme `admin` + plugins. Preserve the imperative ref methods (`seekTo`/`play`/`pause`).
- [ ] Replace [`VideoUploadPreview`](../../f8-dash-ui/src/components/VideoUploadPreview/index.jsx) with the new wrapper.
- [ ] Replace the bare `<video>` in MediaManager with `<Player theme="minimal" controls />`.
- [ ] Drop the legacy bug (`addEventListener` instead of `removeEventListener` in cleanup), the unused sticky overlay, and the unused window CustomEvent API.
- [ ] Remove `video.js` + 7 plugins, `react-player`, `react-video-js-player`.
- [ ] Bundle measurement before/after.

**Exit gate:** `pnpm test` in `f8-dash-ui` and characterization suite both green; admin Course editor smoke pass.

**Suggested model for Phase 5:** Claude Sonnet 4.6 Medium.

---

## Phase 6 — Demos + Storybook + docs site

- [ ] Storybook v8 with the four themes wired; one story per plugin; axe-core addon.
- [ ] Vite + MDX docs site (`docs/site/`); auto-gen API reference from TSDoc.
- [ ] Live playground (Sandpack) with copy-paste recipes for the golden cases.
- [ ] Migration guides: from `react-player`, from `video.js`, from `videojs-markers`.

**Exit gate:** `pnpm -C docs/site build` succeeds; every plugin has a story; axe-core has zero violations.

**Suggested model for Phase 6:** GPT-5.5 High — UI / docs / writing-heavy.

---

## Phase 7 — Audit + CI gates

- [ ] axe-core full theme matrix in CI; manual NVDA + VoiceOver pass.
- [ ] size-limit runs per package; thresholds enforced.
- [ ] Lighthouse CI on the docs site; player-perf custom audit.
- [ ] `pnpm audit` + Snyk in CI; manual review of cookie scope, CORS, URL handling.
- [ ] Real-device pass on BrowserStack: iOS Safari 16+ / 17+, Android Chrome.
- [ ] semantic-release pipeline + `npm provenance` + Changesets.
- [ ] Dependabot configuration.

**Exit gate:** main branch protected; CI gates wired; first 1.0.0-beta.0 published.

**Suggested model for Phase 7:** Claude Opus 4.7 High — operational rigor, supply-chain.

---

## Phase 8 — Public launch

- [ ] Branding site (landing, pricing, docs portal).
- [ ] License engine (Stripe / Lemon Squeezy) for premium plugins/themes.
- [ ] Legal: terms of service, privacy, DPA, EULA for premium tier.
- [ ] npm publish (public for core; private scope for premium).
- [ ] Discord + GitHub Discussions.
- [ ] Anonymous opt-in error telemetry.

**Suggested model for Phase 8:** GPT-5.5 High — landing copy, marketing site, billing flows.

---

## Phase 9 (deferred) — `@f8/player-lit`

- [ ] Lit adapter using Reactive Controllers; custom element `<f8-player>`.
- [ ] Integrate into `f8-pro-ui` after the repo is cloned locally.

---

## Master checklist (rolls up acceptance per golden case)

- [ ] G1 Course learning step
- [ ] G2 Story full-bleed
- [ ] G3 Public video detail
- [ ] G4 Course preview Safari escape
- [ ] G5 Story composer blob preview
- [ ] G6 Landing hero loops
- [ ] G7 Course video lesson editor
- [ ] G8 Transcript / chapter markers
- [ ] G9 Subtitle editor preview
- [ ] G10 Media manager modal preview
- [ ] G11 YouTube tech (admin)
- [ ] G12 Imperative ref API back-compat
- [ ] G13 Authenticated HLS — 401/403 surfacing
- [ ] G14 iOS playsInline + force-HLS
- [ ] G15 VTT cross-origin
- [ ] G16 Custom chrome — keyboard scoping

Each golden case is checked once both Phase 4 (or Phase 5 for admin-only cases) lands and the integration test goes green.
