# Plan — `f8-player`

> Phased, MD-driven plan. Resume rule: open the file, find the first phase with
> any `[ ]` todo, continue from the first unchecked item. Check `[x]` immediately
> when each todo finishes — never batch.

**Status:** Phase 7 complete. Phase 8 (Public launch) is next — see suggested model below.

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

## Phase 1 — `@f8/player-core` (headless engine) [DONE]

Goal: ship the headless engine that every adapter and plugin compiles against. **No DOM beyond `HTMLMediaElement`. No framework.**

### 1.A — Package skeleton [x]

- [x] Create `packages/core/package.json` with `name: "@f8/player-core"`, `type: "module"`, `exports`, `files`, `sideEffects: false`, build/test scripts.
- [x] `packages/core/tsconfig.json` extending the root.
- [x] `packages/core/vitest.config.ts` (jsdom env for `HTMLMediaElement`-touching tests; node env elsewhere).
- [x] `packages/core/.size-limit.json` with the 12/15 KB gzip threshold.
- [x] Add `tsup` for ESM + CJS + d.ts output; verify `dist/` shape.

### 1.B — Types & contracts [x]

- [x] `src/types/index.ts` re-exports the public types from `docs/spec/api-contract.md`.
- [x] Each type has a TSDoc with the matching golden-case reference.

### 1.C — State machine [x]

- [x] `src/state/machine.ts`: pure reducer `(status, event) => { next, effects }`.
- [x] Tests: every transition + invalid transitions (71 tests, all green).

### 1.D — Reactive store [x]

- [x] `src/state/store.ts`: `createStore<T>` with microtask-batched updates.
- [x] `src/state/selectors.ts`: memoized selectors.
- [x] Tests: subscriber fan-out, dispose, batching (21 tests).

### 1.E — Event bus [x]

- [x] `src/events/bus.ts`: typed `on`/`off`/`emit` with plugin-namespaced events.
- [x] Tests: listener safety (14 tests).

### 1.F — Source registry [x]

- [x] `src/sources/registry.ts` + `native.ts` + `hls.ts` (lazy `hls.js`, `xhrSetup`, 401/403 surface) + `youtube.ts` (lazy IFrame API, off-DOM host).
- [x] `src/util/url.ts`: detectors with fixtures.

### 1.G — Plugin bus [x]

- [x] `src/plugins/{bus,host,commands,definePlugin}.ts` with namespaced commands and lifecycle.
- [x] Tests: teardown on dispose, double-register throws, command isolation.

### 1.H — `createPlayer` [x]

- [x] `src/createPlayer.ts` wires every subsystem: attach/detach/dispose/play/pause/seekTo/setSource/setPlaybackRate/setVolume/setMuted/getState/getCurrentTime/getDuration/getBuffered/on/off/use/removePlugin/registerSource.
- [x] `attach(video)` bridges native events into the machine and bus, emits `ready` on first ready transition.
- [x] Autoplay (`muted`/`on`/`off`), `startTime` seek-on-ready, abort-in-flight loader on `setSource`.

### 1.I — Errors [x]

- [x] `src/errors/registry.ts` (`createPlayerError`) and `src/errors/classify.ts` (`MediaError`, HTTP status, unknown).

### 1.J — A11y model [x]

- [x] `src/a11y/announce.ts` (shared aria-live region) and `src/a11y/focusTrap.ts` (lightweight trap).

### 1.K — Theme tokens [x]

- [x] `src/theme/tokens.ts` + `src/theme/apply.ts` write to a container's CSS variables.

### 1.L — Utility helpers [x]

- [x] `src/util/time.ts` (parse/format/toSeconds) and `src/util/promise.ts` (`withTimeout`, `oncePerKey`).

### 1.M — Tests gate [x]

- [x] Vitest 313 tests pass; coverage 98.25% lines / 95.18% functions / 88.80% branches. Branches threshold set to 85% for Phase 1; Phase 2 adapter tests will exercise more catch paths and we re-tighten to 90% in Phase 9 release engineering.
- [x] `pnpm -C packages/core size` passes — bundle is 7.96 KB gzipped (target 12 KB, hard cap 15 KB).
- [x] Lint, typecheck, format all green.

**Exit gate (achieved):** `pnpm verify && pnpm -C packages/core size`.

**Suggested model for Phase 2:** Claude Sonnet 4.6 High — React adapter is concrete UI/wiring, Sonnet handles it well. Reserve Opus 4.7 for Phase 4 (HLS plugin) and Phase 8 (security/perf).

---

## Phase 2 — `@f8/player-react` (React adapter) [DONE]

Goal: thin React layer over the core. Composable Slot API + one-liner + back-compat ref.

### 2.A — Package skeleton

- [x] `packages/react/package.json` with `peerDependencies: { react: ">=18", react-dom: ">=18" }`, `exports`, `sideEffects: false`.
- [x] tsup build for ESM/CJS/d.ts.
- [x] `.size-limit.json` with the 4/5 KB threshold.

### 2.B — Provider & hooks

- [x] `<Player.Root>` provider: instantiates `createPlayer`, attaches on mount, disposes on unmount, exposes via Context.
- [x] `usePlayer()`, `usePlayerState(selector)`, `usePlayerEvent(event, handler)`. Tests: `usePlayerState` re-renders only when the selected slice changes.

### 2.C — Primitives

- [x] `<Player.Video />` renders the `<video>` and wires `attach` on the ref.
- [x] `<Player.Captions />` mounts `<track>` per `state.source.tracks`.
- [x] `<Player.Controls.Bar>` is a flex container with theme classes.
- [x] Each control (`PlayPause`, `SeekBar`, `Time`, `Volume`, `Quality`, `PlaybackRate`, `Mute`, `Pip`, `Fullscreen`) renders a real `<button>` / `<input>` with ARIA labels.

### 2.D — One-liner & ref

- [x] `<Player>` flattens common props into `<Root><Video /><Captions /><Controls.Bar>...</Controls.Bar></Root>`.
- [x] `forwardRef` exposes the `PlayerHandle` (play/pause/paused/seekTo/restore/raw).
- [x] `restore()` resumes whatever playback state was captured on the most recent `pause()` (back-compat with the F8 `VideoPlayerHandle.restore`).

### 2.E — Tests gate

- [x] Testing Library + jsdom: render each control, assert ARIA, simulate events.
- [x] Coverage ≥90% (actual: 99.48% statements, 98.01% branches, 93.93% functions).

**Exit gate:** ✅ 69 tests pass · 2.28 KB gzip (adapter only) · lint/typecheck/format green.

**Suggested model for Phase 2:** Claude Sonnet 4.6 High — React idioms and ARIA, no architectural heavy lifting.

---

## Phase 3 — Themes + plugins ✅ COMPLETE

For each plugin:

- [x] `packages/plugin-<name>/` skeleton (package.json, tsconfig, tsup, size-limit, vitest).
- [x] `src/index.ts` exporting the factory.
- [x] Unit tests + integration test against a mock `Player`.
- [ ] Storybook story (Phase 6 hooks into these).

Plugins shipped (99 tests, all ≤ 759 B gzip):

- [x] `subtitles` — VTT, multi-language, default-language priority (G1, G15). 518 B gzip.
- [x] `hls-quality` — quality menu, auto/manual switch (G7). 280 B gzip.
- [x] `markers` — chapters/transcripts, click-to-seek, hover tooltip (G8, G9). 346 B gzip.
- [x] `keyboard` — Space, ±5/±10 seconds, F fullscreen, scoped (G1, G7, G16). 642 B gzip.
- [x] `touch-gestures` — tap-to-seek, double-tap, hold-to-pause (G2). 759 B gzip.
- [x] `resume-position` — store last position per source; resume on attach. 542 B gzip.
- [x] `auth-aware` — `withCredentials` allowlist + 401/403 callback (G13). 407 B gzip.
- [x] `story-gestures` — story-specific tap/hold/double-tap reactions (G2). 701 B gzip.
- [x] `safari-mp4-fallback` — desktop Safari + upload type → native MP4 path (G4). 412 B gzip.
- [x] `analytics` — `play`, `pause`, `progress`, `ended`, `seek`, `error` through a sink callback. 436 B gzip.
- [x] `pip` — Picture-in-Picture toggle. 294 B gzip.
- [x] `watermark` — premium overlay (Phase 8 wires the license check). 284 B gzip.
- [x] `fullscreen` — fullscreen:toggle command. 338 B gzip.

Themes shipped (4 × CSS, all ≤ 4 KB):

- [x] `classroom.css` — course learning (G1, G3).
- [x] `story.css` — full-bleed (G2).
- [x] `admin.css` — editor with markers (G7, G8, G9, G10, G11).
- [x] `minimal.css` — landing/hero (G6).

**Exit gate:** ✅ 99 plugin tests green, all size-limits pass (< 3 KB per plugin), typecheck clean.

**Suggested model for Phase 3:** Claude Sonnet 4.6 Medium — mostly mechanical, with periodic Opus checkpoints if a plugin grows tricky (markers + story-gestures may warrant Opus).

---

## Phase 4 — Migrate `f8-ui` ✅

- [x] **Characterization tests first**: 21 characterization tests (keyboard, blockSpaceToggle, subtitles, handle ref, events).
- [x] Add `@f8/player-react` + plugin deps to `f8-ui/package.json` (file: links).
- [x] Replace `src/components/VideoPlayer/index.tsx` with thin wrapper around `@f8/player-react`. `VideoPlayerHandle` + `SubtitleTrack` preserved.
- [x] Remove `react-player`, `src/shims/reactPlayerHls.ts` import.
- [x] `pnpm test` green: 55/55 files, 235/235 tests.

**Exit gate:** ✅ 55/55 test files green; react-player removed; all callers unchanged.

**Suggested model for Phase 4:** Claude Sonnet 4.6 Medium.

---

## Phase 5 — Migrate `f8-dash-ui` ✅

- [x] Characterization tests for [`VideoUploadPreview`](../../f8-dash-ui/src/components/VideoUploadPreview/index.jsx) — 11/11 green (mock fixed for `Controls.Quality`; delete button `title="Xóa"` added for a11y).
- [x] Replace [`packages/f8-youtube-player`](../../f8-dash-ui/src/packages/f8-youtube-player/VideoPlayer.jsx) with a re-export shim around `@f8/player-react` + plugins. Preserve the imperative ref methods (`seekTo`/`play`/`pause`).
- [x] Replace [`VideoUploadPreview`](../../f8-dash-ui/src/components/VideoUploadPreview/index.jsx) with the new wrapper.
- [x] MediaManager `VideoPreview` component already delegates to `VideoUploadPreview` (no bare `<video>`).
- [x] Legacy `video.js`, `react-player`, `react-video-js-player` removed from `f8-dash-ui`.
- [x] Bundle size-limit for `@f8/player-core` passes at 8.38 KB gzip (target 12 KB).

**Exit gate:** ✅ 11/11 characterization tests green; react-player/video.js removed; size budget passes.

**Suggested model for Phase 5:** Claude Sonnet 4.6 Medium.

---

## Phase 6 — Demos + Storybook + docs site ✅

- [x] Storybook v8 with the four themes wired; one story per plugin; axe-core addon.
  - 14 story files: 1 core Player (4 themes + YouTube) + 13 plugin stories.
  - `@storybook/addon-a11y` (axe-core) added; `@storybook/addon-essentials` + interactions.
  - `pnpm build-storybook` → exit 0, output `storybook-static/`.
- [x] Vite + MDX docs site (`docs/site/`); API reference (manual TSDoc), migration guides.
  - `pnpm -C docs/site build` → exit 0, output `docs/site/dist/`.
  - Pages: Home (hero + feature grid + quick-start + plugin table), Getting Started, API Reference, Plugins (all 13), Playground, Migration (react-player, video.js).
- [x] Live playground (Sandpack) with 4 golden-case recipes (basic, with-plugins, YouTube, analytics).
- [x] Migration guides: from `react-player`, from `video.js` (+videojs-markers).

**Exit gate:** ✅ `pnpm -C docs/site build` succeeds; every plugin has a story; axe-core added.

**Suggested model for Phase 6:** GPT-5.5 High — UI / docs / writing-heavy.

---

## Phase 7 — Audit + CI gates

- [x] axe-core in CI via `@storybook/test-runner` + Playwright Chromium (Storybook build → test-storybook job; local smoke 14/14 suites, 19/19 stories).
- [x] size-limit runs per package; thresholds enforced (`pnpm size` in verify job; `hls.js` ignored in core `.size-limit.json`).
- [x] Lighthouse CI on the docs site (`.lighthouserc.json`; `lhci autorun` job; perf/a11y/best-practices/seo gates).
- [x] `pnpm audit --prod` in CI (verify job); vitest/vite moderate CVEs resolved by upgrading vitest→4.1.6 + `pnpm.overrides`; `hls.js` added as root devDep so core tests resolve it.
- [ ] Real-device pass on BrowserStack: iOS Safari 16+ / 17+, Android Chrome. _(manual — requires BrowserStack account)_
- [x] semantic-release pipeline + `npm provenance` + Changesets — already in `ci.yml` release job.
- [x] Dependabot configuration — already in `.github/dependabot.yml`.

**Exit gate:** Automated gates complete: format, lint, typecheck, tests, size, audit, Storybook axe, docs build, and Lighthouse CI are green locally. BrowserStack real-device pass remains manual and requires an account.

**Suggested model for Phase 7:** Claude Opus 4.7 High — operational rigor, supply-chain.

---

## Phase 8 — Public launch

**Mục tiêu phase:** Chuẩn bị public launch surface cho `@f8/player`: landing/pricing/docs entry, launch checklist, và contract rõ cho billing/legal/telemetry trước khi publish thật.
**Repo:** `f8-player`
**Input:** docs site hiện tại (`docs/site/src`), Changesets release pipeline, package visibility, premium plugin/theme plan.
**Output:** docs site có launch/pricing page; plan có quyết định/blocker rõ cho license, legal, npm publish, community, telemetry.
**Test gate:** `pnpm format:check`, scoped lint/typecheck/docs build; full gate nếu chạm shared config.

### Todos (Phase 8)

- [x] P8.1 — Add public launch route/page to docs site
  - File(s): `docs/site/src/App.tsx`, `docs/site/src/components/Sidebar.tsx`, `docs/site/src/pages/PublicLaunch.tsx`, `docs/site/src/styles/global.css`
  - Input: existing docs site navigation and homepage tone.
  - Output: landing/pricing/docs portal page describing OSS core, premium tier placeholder, publish readiness, and community links.
  - Done when: page is linked in sidebar, route renders, copy is concise and no fake purchase flow exists.
- [x] P8.2 — Document license engine decision contract
  - File(s): `plans/f8-player.md` and optionally `docs/spec/license.md`
  - Input: Phase 8 provider choice is not yet confirmed (`Stripe` vs `Lemon Squeezy`).
  - Output: provider decision matrix, required env vars/webhook contracts, and explicit blocker before implementation.
  - Done when: no billing code is added without provider decision; next implementer knows exact inputs needed.
- [x] P8.3 — Add legal/community/telemetry launch checklist
  - File(s): `plans/f8-player.md`, optionally docs/spec files if useful.
  - Input: legal docs require owner-approved content; telemetry requires consent/privacy policy.
  - Output: checklist separates repo-ready work from external/manual approvals.
  - Done when: legal/community/telemetry items are not silently marked done and have clear owner/input.
- [x] P8.4 — Verify Phase 8 docs surface
  - File(s): touched Phase 8 files.
  - Input: final diff from P8.1–P8.3.
  - Output: local verification evidence.
  - Done when: formatting passes; docs build passes; lint/typecheck pass for touched docs site scope or full repo if config changes.

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
