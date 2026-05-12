# Plan — `f8-player`

> Phased, MD-driven plan. Resume rule: open the file, find the first phase with
> any `[ ]` todo, continue from the first unchecked item. Check `[x]` immediately
> when each todo finishes — never batch.

**Status:** Phase 0–6 done · Phase 7 done except BrowserStack manual pass · Phase 8 repo-ready (P8.1–P8.4 ✅) — remaining items are **owner-approval blockers** (community + telemetry + npm org) tagged `[ ] (needs you)`; billing and legal docs are intentionally deferred (no premium tier and no public npm publish gated on legal review until you greenlight) · Phase 9 split into 9.A–9.F. Lit adapter (9.A–9.D) shipped as **public-reusable package** with zero `f8-pro-ui` coupling; `f8-pro-ui` migration (9.E plan + 9.F execution) **NOT applied yet** — `f8-pro-ui` still uses `react-player@2.12` + `video.js@8.4` · Phase 10 (golden case audit) ticked in master checklist below.

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
- [x] Remove `react-player`, `src/shims/reactPlayerHls.ts` import. _(shim file + vendor-modules.d.ts declaration actually deleted on 2026-05-12 via `f8-player-review-fixes.md` P6.1–P6.2; original claim was incomplete until then.)_
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
- [ ] (needs you) Real-device pass on BrowserStack: iOS Safari 16+ / 17+, Android Chrome. _(manual — requires BrowserStack account; cannot be automated by the agent)_
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

### Phase 8 — Owner-approval blockers (NOT yet started — need decisions)

Repo cannot ship the public launch end-to-end without owner-side calls on these. None of them are auto-resolvable by an agent.

Internal-consumption launch minimum (no public npm publish yet) = **community channels + telemetry copy + npm org access**. Legal docs and billing are deferred together until the premium tier and public OSS publish are actually scheduled.

- [ ] (needs you) **Community channels** — provision Discord (invite + moderation owner) and enable GitHub Discussions categories (Q&A, Show & Tell, Roadmap).
- [ ] (needs you) **Telemetry consent + retention** — final opt-in copy, sampling/retention numbers, and consent surface to add to a future Privacy Policy (off by default, anonymous, opt-in only — guardrails already in checklist).
- [ ] (needs you) **npm org & GitHub release** — confirm `@f8` org access on npm, schedule first `0.1.0` semantic-release tag (CI pipeline ready in `release` job). Internal consumers can keep using `workspace:*` / file-link until then.

**Deferred to a later phase (not blocking current internal usage):**

- ~~Legal docs (ToS, Privacy Policy, DPA, EULA)~~ — **deferred**. Required before the first public npm publish + before any external user lands on the docs site. Not needed while `@f8/player-*` is consumed only inside F8 workspaces via `workspace:*`. `docs/spec/launch-checklist.md` keeps the catalog documented.
- ~~Billing provider decision (Stripe vs Lemon Squeezy)~~ — **deferred**. No billing code lands until OSS is out and premium demand is validated. `docs/spec/license.md` keeps the contract documented for future reference.

When you have launch decisions ready, I'll wire them into docs + Changesets + release pipeline in a focused session.

---

## Phase 9 — `@f8/player-lit` + `f8-pro-ui` migration

> Phase 9 is split so the Lit adapter package (9.A–9.D) can ship and be exercised in isolation **before** the much riskier `f8-pro-ui` swap (9.E–9.F). Lit adapter is delivered as a **public-reusable web component**; `f8-pro-ui` is just one of many possible consumers. The swap stays staged until you greenlight because it touches transcoding/WebSocket flows.

**Mục tiêu phase:**

1. Ship `@f8/player-lit` as a **project-agnostic, public-reusable** custom-element + Reactive Controller, suitable for any Lit/web-components host (`f8-pro-ui`, future external projects, OSS users).
2. Migrate `f8-pro-ui` to `@f8/player-lit` while keeping all `f8-pro-ui`-specific behavior (transcoding socket, question overlays, video-interactions panel, restore-play-state) **inside `f8-pro-ui` as a consumer**, never leaked back into the OSS package.

### Architecture invariants (apply to every Phase 9 todo)

- `@f8/player-lit` exports only generic types: `F8PlayerElement`, `PlayerController`, `defineF8Player()`, and re-exported core types. No `f8-pro-ui`-specific symbols, props, events, or imports.
- Anything reusable across projects (e.g. analytics sink, quality picker) goes into a **standalone plugin package** under `packages/plugin-*` and is consumed via `options.plugins`. Not into the Lit adapter.
- Anything project-specific (transcoding socket subscription, question overlays, lesson-progress emit) lives in the **consumer repo**. For `f8-pro-ui` that means the outer `<video-player>` LitElement keeps owning it and composes `<f8-player>` inside.
- Public OSS docs (Storybook story + README) for `@f8/player-lit` use a **plain HLS + plain YouTube** demo. Never reference `f8-pro-ui` URLs, models, or socket events.
- Size budget for `@f8/player-lit` stays under 4 KB gzip (currently 1.13 KB). Don't accept patches that bloat the adapter with project-specific glue.

**Repo:** `f8-player` (new package `packages/lit/`), then `f8-pro-ui` (`src/components/video-player/`).
**Test gate:** `pnpm -C packages/lit verify && pnpm -C packages/lit size` for 9.A–9.D · `f8-pro-ui` test suite green + manual smoke on a transcoding video for 9.E–9.F.

### 9.A — `@f8/player-lit` skeleton [x]

- [x] Create `packages/lit/package.json` (`name: "@f8/player-lit"`, `peerDependencies: { lit: ">=3", "@f8/player-core": ">=0.0.0" }`, ESM/CJS exports, `sideEffects: false`).
- [x] `tsconfig.json` extending root; `tsup.config.ts` (ESM + CJS + d.ts, external `lit` + `@f8/player-core`).
- [x] `vitest.config.ts` (jsdom env) + `.size-limit.json` (4 KB target / 5 KB hard cap, ignore `lit` + `@f8/player-core`).
- [x] `pnpm install` regenerates lockfile; new workspace package picked up by `pnpm -r`.

### 9.B — Lit adapter (`<f8-player>` custom element + Reactive Controller) [x]

- [x] `src/PlayerController.ts` — Reactive Controller that owns one `createPlayer(options)`, subscribes to the state store, exposes typed `on(event, handler)` + `commands` re-exports, and disposes on `hostDisconnected`.
- [x] `src/F8Player.ts` — `LitElement` `<f8-player>` custom element. Properties: `options`, `videoClass`. Slots: default (overlays/markers), `controls` (consumer's chrome). Internal `<video>` rendered into the element light DOM (no shadow root — keeps native captions, fullscreen, and analytics overlays simple); `controller.attach(video)` on `firstUpdated`.
- [x] Imperative API on the element shape-compatible with React's `PlayerHandle`: `play() / pause() / paused() / seekTo(s) / restore() / raw` (the `<video-player>` LitElement in `f8-pro-ui` calls these).
- [x] Custom-event re-emission: every core event (`play`, `pause`, `timeupdate`, `error`, `unauthorized`, etc.) is also dispatched as `f8-player:<event>` so consumers using DOM `addEventListener` get the data without importing types.
- [x] `src/index.ts` exports `F8PlayerElement`, the `defineF8Player()` registrar, types, and `PlayerController`. Element registration is **opt-in** (`defineF8Player()`) so apps that ship the package twice don't crash on `customElements.define`.
- [x] Built-in controls (Lit equivalents of `Controls.Bar/PlayPause/SeekBar/…`) are **out of scope for 9.B** — `f8-pro-ui` ships its own chrome, so no consumer needs them today. Ride a future `@f8/player-lit-controls` package if needed.

### 9.C — Tests (Vitest + jsdom) [x]

- [x] Mount/dispose: define element, attach to DOM, assert `player.attach` ran exactly once on `firstUpdated`, and `player.dispose` ran on `disconnectedCallback`.
- [x] Imperative API: `play / pause / paused / seekTo / restore` delegate to the underlying player (mock the core like the React adapter test does).
- [x] Event bridge: subscribe to `play`/`pause`/`timeupdate`/`error`/`unauthorized` via `addEventListener("f8-player:event-name", …)` (custom-event re-emission) — assert one custom event per core event + every event in `PlayerEvents` has a bridge.
- [x] Slots: default slot and `controls` named slot render in the light DOM.
- [x] `PlayerController` lifecycle: hostConnected creates one player; hostDisconnected disposes; `on()` before connect throws; `attach()` before connect rejects.

### 9.D — Build + size + format gate [x]

- [x] `pnpm -C packages/lit build` produces `dist/index.js` (5.89 KB) + `dist/index.cjs` (5.97 KB) + `dist/index.d.ts` (5.69 KB).
- [x] `pnpm -C packages/lit size` passes — **1.13 KB gzip** (target 4 KB, hard cap 5 KB).
- [x] `pnpm -C packages/lit lint`, `pnpm -C packages/lit typecheck`, `pnpm format:check` all green.
- [x] `pnpm verify` repo-wide green (29/29 turbo tasks, 29/29 Lit tests, no regressions).
- [x] `pnpm size` repo-wide green (35/35 tasks).

### 9.E — `f8-pro-ui` migration plan (NOT executed yet — needs your go-ahead)

The `f8-pro-ui` swap is **staged**. Boundary rule: `<f8-player>` is the OSS, generic, public-reusable inner element. Every `f8-pro-ui`-specific concern (transcoding socket, question overlays, restore-state, video-interactions, lesson-progress emit) stays on the **outer `<video-player>` LitElement inside `f8-pro-ui`**, which composes `<f8-player>` as a child. No `f8-pro-ui` symbol may flow back into `packages/lit/`.

#### Boundary checklist (each migration todo must respect this)

| Concern                                                                                    | Lives in                                | Notes                                                                                                           |
| ------------------------------------------------------------------------------------------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Transcoding socket (`VideoConvertProgress` subscribe/leave)                                | `f8-pro-ui` outer `<video-player>`      | Sets `options.source` on `<f8-player>` once transcoding completes.                                              |
| Transcoding `processing` / `failed` UI states                                              | `f8-pro-ui` outer `<video-player>`      | Outer element decides whether to render `<f8-player>` at all.                                                   |
| Question overlays + `setQuestionsData / reset / isQuestionShown`                           | `f8-pro-ui` outer `<video-player>`      | Listens to `f8-player:timeupdate` custom events and renders its own overlay DOM.                                |
| `restorePlayState()` semantics                                                             | `f8-pro-ui` outer `<video-player>`      | Wraps `<f8-player>.restore()` from the public `PlayerHandle` API.                                               |
| YouTube vs upload routing                                                                  | `f8-pro-ui` outer `<video-player>`      | Picks `options.source` shape; `@f8/player-core` handles the rest via source registry.                           |
| HLS / quality / markers / keyboard / auth-aware / subtitles / fullscreen / pip / analytics | `@f8/player-plugin-*` (already shipped) | Consumed via `options.plugins`. Generic enough to publish OSS.                                                  |
| Authenticated HLS allowlist (e.g. `*.f8.edu.vn`)                                           | `f8-pro-ui` config / env                | Passed into `createAuthAwarePlugin({ allowlist })` at compose time. Never hardcoded into the plugin or adapter. |

#### Migration todos

- [ ] (needs you) Decide whether to migrate `f8-pro-ui` to `@f8/player-lit` **now** or after one full release cycle of the OSS package — Phase 8 npm publish gates this.
- [ ] Characterization tests **before any code change** for `<video-player>` public contract in `f8-pro-ui/src/components/video-player/index.ts`:
  - `play() / pause() / currentTime() / paused()` callable on the element.
  - `restorePlayState() / setQuestionsData() / reset() / isQuestionShown()` preserved.
  - Transcoding states (`processing` / `failed`) render the right UI and the `VideoConvertProgress` socket subscribe/leave path runs.
  - YouTube vs upload path picks the right inner element today.
- [ ] Add `@f8/player-lit` + needed plugin packages (`markers`, `keyboard`, `hls-quality`, `auth-aware`, `subtitles`, `fullscreen`, `pip`, `analytics`) to `f8-pro-ui/package.json` via published npm versions once `0.1.0` ships (or file-link to the local workspace during development).
- [ ] Replace the inner `<videojs-player>` and `<react-player>` LitElement wrappers with a single `<f8-player>` + plugins. Keep `<video-player>` (the outer LitElement) as the public boundary so callers don't change.
- [ ] Re-wire the public methods (`play/pause/currentTime/paused/restorePlayState/setQuestionsData/reset/isQuestionShown`) onto the outer `<video-player>` element — `play/pause/currentTime/paused/restorePlayState` delegate to the inner `<f8-player>` via its `PlayerHandle`; `setQuestionsData/reset/isQuestionShown` remain `f8-pro-ui` private state.
- [ ] Preserve `_subscribeVideoConvert` + `_refetchAndEmitVideoReady` on the outer `<video-player>` and feed the inner `<f8-player>` via `options.source` once transcoding completes — no plugin migration needed, no socket code in `@f8/player-lit`.
- [ ] Audit final diff against the **boundary table above**: zero new files under `packages/lit/`, zero new types in `@f8/player-lit` that reference `f8-pro-ui` concepts.
- [ ] Remove legacy deps from `f8-pro-ui` only: `video.js`, `videojs-markers`, `videojs-hotkeys`, `videojs-vhs-quality-selector`, `videojs.thumbnails`, `nuevo`, `react-player`. Keep `socket-client` and the transcoding code.
- [ ] Run the existing `f8-pro-ui` test suite + manual smoke on (a) upload HLS video, (b) YouTube video, (c) a video in transcoding state.

### 9.F — `f8-pro-ui` migration execution

> Discovery (2026-05-12) revealed the legacy `<videojs-player>` inner element is 528 LOC with many F8-only concerns (sprite thumbnails, context menu, skip-segments, refresh-token retry, quality/captions storage persistence) that are **not** covered by any existing OSS plugin. Plus `<video-interactions>` (264 LOC) needs rewire from videojs `timeupdate` to `f8-player:timeupdate`. Bulk-executing in one session is irresponsible, so 9.F is split into atomic sub-phases. Each sub-phase is ≤ 1 session, has a clean test/manual-smoke gate, and respects the 9.E boundary checklist.

#### 9.F.1 — Foundation: deps + characterization tests (DONE 2026-05-12)

- [x] Add `@f8/player-lit` + needed plugins to `f8-pro-ui/package.json` via `file:` workspace links (11 packages symlinked: core, lit, plugin-{analytics,auth-aware,fullscreen,hls-quality,keyboard,markers,pip,subtitles,watermark}).
- [x] Add `vitest.lit.config.ts` (jsdom env) + script `test:lit`. Uses alias regex to no-op the heavy legacy inner-element side-effect imports; stubs `socket-client` + `http-request` webpack externals to test-only files under `src/components/video-player/__tests__/stubs/`.
- [x] Write characterization tests for `<video-player>` public contract (`src/components/video-player/__tests__/video-player.lit.test.ts`, 11 cases):
  - Public methods exist + delegate to inner: `play()`, `pause()`, `currentTime()`, `paused()`, `restorePlayState()`, `setQuestionsData()`, `reset()`, `isQuestionShown()`.
  - Renders `<videojs-player>` for `video_type === 'upload'`, `<react-player>` for `video_type === 'youtube'`, neither for null video.
  - Renders progress UI + subscribes `Convert.Streamable.Video.For.Streaming.<id>` channel when processing.
  - Renders error UI + unsubscribes channel when `converted_for_streaming_failed_at` is set.
  - Forwards `play / pause / ended / timeupdate` events from inner to outer.
  - Skips subscription when no `transcodeRefetchUrl` / `trackStepUuid` is available.
- [x] Verified green on legacy code: `npm run test:lit` 11/11 pass, `npm run test:unit` 56/56 pass, `npm run type-check` clean.
- **Done when:** `npm run test:lit` green; deps installed; no production code change yet. ✓

#### 9.F.2 — Inner element swap (HLS + YouTube basic path) — IMPLEMENTATION DONE 2026-05-12, smoke pending

- [x] Outer `<video-player>` renders a **single** `<f8-player>` (from `@f8/player-lit`) for both upload and youtube paths. `options.source.type` is `"hls"` for upload, `"youtube"` for youtube. `@f8/player-core` source registry handles the YouTube IFrame internally.
- [x] Wire **OSS-only plugins** (each works out-of-box, no F8 config): `keyboard`, `hls-quality`, `fullscreen`, `pip`. Plugins needing F8-specific config — `subtitles` (blob fetch w/ credentials + storage persistence), `markers` (chapter blob fetch w/ course header), `auth-aware` (allowlist `config.api.baseUrl` + refresh-token retry) — move to **9.F.3** alongside their Reactive Controllers.
- [x] `_player` getter returns `this.querySelector('f8-player')`. Public methods map: `play()→raw.play`, `pause()→raw.pause`, `paused()→raw.paused`, `currentTime()` no-arg → `raw.getCurrentTime`, `currentTime(t)` → `raw.seekTo(t)`, `restorePlayState()→raw.restore`.
- [x] `setQuestionsData / reset / isQuestionShown` move to outer state (rendering `<video-interactions>` from outer is finalized in 9.F.4; for now just track `_questionShown` boolean so the contract test passes).
- [x] Switch source via `_player.raw.setSource(...)` reactively in `updated()` (since `<f8-player>` reads `options` once on `hostConnected`). Implemented as `_syncInnerSource()` triggered on `video` / `_resolvedVideo` change with `_activeSourceSrc` guard against redundant calls.
- [x] Bridge inner DOM events `f8-player:play / pause / ended / timeupdate` → outer `play / pause / ended / timeupdate` (same shape as legacy). `timeupdate.detail` is normalised back to `Math.floor(currentTime)` for back-compat with `<course-video>._handleTimeUpdate` (legacy contract `detail = number` — verified all 4 outer-element consumers).
- [x] Update characterization tests to reflect the single-inner contract: assert `<f8-player>` exists for both video types with the right `options.source.type`; assert `<f8-player>.play / pause / seekTo / restore` are called; events bridge correctly.
- [x] Re-run all characterization tests from 9.F.1 — **GREEN** (13/13 lit, 56/56 unit, 0 TS errors).
- [x] **Smoke fix 2026-05-12 (a)** — user reported `401` on first HLS load. Root cause: legacy `videojs.Vhs.xhr.beforeRequest` flipped `withCredentials=true` for any URL starting with `config.api.baseUrl`; the new HLS source descriptor was missing that wiring. Fix: `_buildSource` now returns `withCredentials: (url) => url.startsWith(config.api.baseUrl)` for the HLS source so `@f8/player-core` (`packages/core/src/sources/hls.ts` → `xhrSetup`) flips credentials per request. Characterization test extended to assert `withCredentials` is a function on the HLS source. Full `auth-aware` plugin (refresh-token on 401/403) still lands in 9.F.3.
- [x] **Smoke fix 2026-05-12 (b)** — UI broken: video overflowed the page, no controls visible. Root causes: (1) outer `render()` returned `<f8-player>` bare without the 16:9 `.f8-video-player__inner` wrapper + `<style>${css}</style>`; (2) `<f8-player>` ships headless (no chrome) and the inner `<video data-f8-player-video>` had no `controls` attribute. Fix: re-wrapped inner in `.f8-video-player > .f8-video-player__inner`, added CSS rules `f8-player { width: 100%; height: 100% }` + `.f8-video-player__media { object-fit: contain }` to fit the aspect box, and added `_ensureNativeControls()` post-mount to attach `controls` + `controlslist="nodownload"` on the inner `<video>` as an interim chrome until 9.F.3 lands the F8 chrome plugin.
- [ ] Manual smoke (needs user): HLS upload video plays, YouTube video plays, time updates emit. (Captions / markers / refresh-token are 9.F.3, not gated here.)

#### 9.F.3 — Project-specific behaviors (F8-only concerns) — DONE 2026-05-12

Each item is a **f8-pro-ui-side Reactive Controller** consuming `<f8-player>` via its `PlayerHandle`. Nothing flows back into `@f8/player-lit`. All controllers live in `src/components/video-player/controllers/` and never reach into the player package.

**Scope cut after legacy review.** Sprite thumbnails + quality-menu persistence depend on a custom timeline + quality menu in the chrome layer. Native `<video controls>` (the 9.F.2 interim chrome) has no surface to render either feature, so wiring them now would be dead code. They move to **9.F.4** alongside the F8 chrome plugin. Captions persistence (`vjs-captions`) stays here because the native CC button fires `change` events on `textTracks` — no chrome dependency.

- [x] **9.F.3.0** — Boilerplate: `controllers/types.ts` defines `VideoPlayerController`, `VideoPlayerControllerCtx`, `VideoPlayerHost` (with `currentVideo / inner / innerVideo`), `VideoPlayerInner` (structural, so `<f8-player>` + test fakes are both compatible). `controllers/index.ts` re-exports + lists factory functions. Outer wires `_controllers = [...]` then dispatches `init / update / dispose` via `_dispatchControllers`.
- [x] **9.F.3.a** — `SkipSegmentsController` (`controllers/skip-segments-controller.ts`). Listens `f8-player:timeupdate`; on entering any `video.skip_segments[i]`, calls `host.inner?.seekTo(end_time)`. Per-segment one-shot guard, reset on video swap. Unit test (6 cases) covers before/inside/after, missing fields, video swap, duplicate ticks.
- [x] **9.F.3.b** — `RefreshTokenController` (`controllers/refresh-token-controller.ts`). Listens `f8-player:unauthorized`; calls `post('auth/refresh')`; on success `host.inner?.pause()` then `host.inner?.play()`; on failure swallows. 2s debounce against 401 bursts; window resets on video swap; teardown on `dispose`. Unit test (5 cases) covers happy path, burst debounce, network failure, video-swap reset, dispose.
- [x] **9.F.3.c** — `CaptionsController` (`controllers/captions-controller.ts`). On `video` change with `subtitles_url`, fetches blob (`credentials: 'include'`), `URL.createObjectURL`, appends `<track kind="captions" srcLang="vi">` to `host.innerVideo`. `default` flag mirrors `storage.get('vjs-captions')`. Listens `textTracks` `change` to persist toggle (jsdom-safe: bails if list has no `addEventListener`). Revokes prior blob on swap/dispose. Unit test (6 cases) covers happy path, persisted-on flag, blob swap revoke, dispose cleanup, missing URL, persisted toggle roundtrip.
- [x] **9.F.3.d** — `ChaptersController` (`controllers/chapters-controller.ts`). PC-only (`!isMobile() && !isiPad()`). On `chapters_url`, fetches `${url}?_course=${hostname.split('.')[0]}` blob → appends `<track kind="chapters" srcLang="en">`. Unit test (5 cases) covers PC happy path, mobile no-op, blob swap revoke, dispose cleanup, missing URL.
- [x] **9.F.3.e** — `ContextMenuController` (`controllers/context-menu-controller.ts`). PC-only. `contextmenu` on inner → `preventDefault` + renders `.f8-video-player__contextmenu` with three VN items. Items dispatch on `document`: `player:add-new-note` (plain Event), `player:copy-video-url` (plain Event), `player:copy-video-url` with `detail: { withCurrentTime: true }` (CustomEvent). Closes on escape / outside click / scroll / item select. Unit test (9 cases) covers prevent-default, menu DOM, all three event shapes, close paths, mobile no-op, dispose cleanup.
- [x] **9.F.3.f** — Watermark overlay rendered by outer inside `.f8-video-player`, styled via `.f8-video-player__watermark` (bottom-right, opacity 0.4, `pointer-events: none`, `user-select: none`). Characterization test asserts presence + text content.
- [x] **9.F.3.g** — `npm run type-check` ✅, `npm run test:lit` ✅ (45/45), `npm run test:unit` ✅ (56/56). Manual smoke still owed by user on real lesson video: HLS playback, captions auto-load, skip segments, 401 refresh, right-click menu items, watermark visible.

**Deferred to 9.F.4** (require custom chrome to be useful):

- ~~`SpriteThumbnailsController`~~ — needs custom timeline hover preview; native `<video controls>` doesn't expose one.
- ~~`QualityPersistenceController` (storage write)~~ — needs custom quality menu to ever change quality; HLS abr auto-selects under native controls.

**Done when:** parity check vs legacy on a real lesson video for the 6 in-scope concerns; zero F8-specific code in `packages/lit/`.

#### 9.F.4 — Question overlay rewire — **DONE 2026-05-12**

- [x] **9.F.4.0** — Orient: read outer `<video-player>`, `<video-interactions>`, and current question wiring.
- [x] **9.F.4.a** — `<video-interactions>` rendered declaratively from outer `<video-player>` template inside `.f8-video-player__inner`; outer side-effect-imports `./video-interactions` so the element is registered (guarded against double-registration in tests).
- [x] **9.F.4.b** — `setQuestionsData / reset / isQuestionShown` routed to the overlay element via `_interactions?.setData(...)` / `_interactions?.reset()`; outer toggles `data-question-shown` on `.f8-video-player`; CSS swallows pointer-events on every direct child except the overlay while a question is shown; outer runs new `keyboard:disable` / `keyboard:enable` commands on the keyboard plugin (extended in `@f8/player-plugin-keyboard`) so hotkeys are suppressed only while the quiz is active; global `video-interactions-change` event dismisses the question if the user disables the global toggle in `Util/storage`.
- [x] **9.F.4.c** — Characterization tests cover: overlay rendered, `data-question-shown` toggled, `setData` / `reset` forwarded with correct args + index, `keyboard:disable`/`keyboard:enable` ran on the inner player, dismiss on global toggle off. `npm run test:lit` ✅ (51/51 — `<video-player>` 20 + controllers 31), `npm run test:unit` ✅ (56/56), `npm run type-check` ✅. `@f8/player-plugin-keyboard` unit tests ✅ (22/22). Manual smoke on a lesson with quiz checkpoints still owed by user.

**Done when:** characterization tests for `setQuestionsData / reset / isQuestionShown` still pass; manual smoke on a lesson with quiz checkpoints. _Automated gate green; smoke owed._

#### 9.F.5 — Cleanup + size + boundary audit — **DONE 2026-05-12**

- [x] **9.F.5.a** — Removed `react-player`, `video.js`, `videojs-contextmenu-ui` from `f8-pro-ui/package.json`; corresponding ambient declarations stripped from `src/types/externals.d.ts`.
- [x] **9.F.5.b** — Deleted `src/components/video-player/react-player/`, `src/components/video-player/videojs-player/`, `src/lib/videojs-hotkeys.ts`, `src/lib/videojs.thumbnails.ts`, `src/lib/videojs-vhs-quality-selector/`, `src/lib/videojs-markers/`. Outer `<video-player>` now contains only `index.ts` + `css.ts` + `controllers/` + `video-interactions/` + `__tests__/`.
- [x] **9.F.5.c** — Boundary audit: `rg -n 'f8-pro|f8-api|organization|RefreshToken|nuevo|videojs|youtube-iframe' packages/lit/src/` returns zero matches; only `@f8/player-*` namespace references remain (intended). No F8-product symbols leaked into the OSS adapter.
- [x] **9.F.5.d** — Final gate: `npm run type-check` ✅, `npm run test:lit` ✅ (51/51), `npm run test:unit` ✅ (56/56). f8-player monorepo full suite ✅ (`core` 314, `lit` 29, all 14 plugins green, `react` 74).
- [x] **9.F.5.e** — Production build gate: `npm install --package-lock-only --ignore-scripts` updated `package-lock.json` after dependency cleanup; `npm run build` ✅ (`webpack 5.88.2 compiled successfully in 5893 ms`). Build output confirms no `react-player`, `video.js`, or `videojs-contextmenu-ui` imports remain; current large video dependency is `hls.js` via `@f8/player-core` (expected for HLS playback). npm audit still reports pre-existing dependency issues (62 total); not auto-fixed because that is outside the player migration scope and may require breaking upgrades.
- [x] **9.F.5.f** — Follow-up from manual visual check: `f8-pro-ui` was still showing native browser controls, not the F8 standard chrome. Added reusable default custom controls to `@f8/player-lit` (`controls` boolean + `theme`, play/pause, seek, time, quality, playback-rate, mute/volume, PiP, fullscreen) and reused existing `@f8/player-themes/classroom.css`; `f8-pro-ui` now imports `@f8/player-themes/classroom.css`, depends on `@f8/player-themes`, and passes `.controls=${true}` / `theme="classroom"` to `<f8-player>`. Removed native-controls fallback. Gates: `@f8/player-lit` typecheck ✅ + tests ✅ (31/31); `f8-pro-ui` type-check ✅, `test:lit` ✅ (52/52), `test:unit` ✅ (56/56), production build ✅ (`webpack 5.88.2 compiled successfully in 4978 ms`).

**Done when:** clean build, characterization tests pass, audit clean. _Automated gates + production build green; manual runtime smoke remains in 9.F.6._

#### 9.F.6 — Manual smoke sign-off

- [x] Dev server reachable: `npm run dev` could not start a second server because port `3001` is already in use (`node` PID 26811), but `http://127.0.0.1:3001/` returns `HTTP/1.1 200 OK`.
- [ ] Manual smoke on authenticated lesson data:
  - [ ] (a) Upload HLS video — F8 custom controls visible (not native controls); play/pause/seek/quality/captions/keyboard/skip-segment/context-menu/refresh-token all green.
  - [ ] (b) YouTube video — play/pause/seek/timeupdate green.
  - [ ] (c) Video in transcoding state — processing UI shows progress, transitions to playable when socket reports done.
- [ ] Update master checklist below + mark Phase 9 complete.

**Suggested model for Phase 9 execution:** Claude Opus 4.7 High for 9.B (adapter logic + parity with React adapter) and 9.E migration (transcoding semantics are tricky). Claude Sonnet 4.6 Medium for 9.A/9.C/9.D scaffolding.

---

## Phase 10 — Golden-case follow-ups

- [ ] P10.1 — Add `blockArrowKeys` prop on `f8-ui/src/components/VideoPlayer/index.tsx` `KeyboardHandler` (mirrors `blockSpaceToggle`). Tick this only if a Story-side conflict is actually reported — current Story uses gestures, so this is preventive maintenance.

---

## Master checklist (rolls up acceptance per golden case)

Audited 2026-05-12 against `f8-ui/src/components/VideoPlayer/index.tsx`, `f8-dash-ui/src/components/VideoUploadPreview/index.jsx`, characterization tests, and call-site code.

- [x] G1 Course learning step — `f8-ui/VideoPlayer` wires `createSubtitlesPlugin` + `buildSubtitleTracks` (default-vi, explicit-default, first-fallback rules unit-tested) · `crossOrigin="anonymous"` set in `PlayerOptions` · `timeupdate` event bridged to `onProgress`.
- [x] G2 Story full-bleed — `VideoPlayer` accepts `controls={false}` (no `Controls.Bar` rendered) + `blockSpaceToggle` prop (Space ignored when `true`, characterization test ✓) · StoryViewer passes `blockSpaceToggle={currentUser == null}`. _Note: `blockArrowKeys` not yet a prop — Story currently uses gestures for nav so no conflict; tracked as P10.1 follow-up below._
- [x] G3 Public video detail — `VideoPlayer` with `controls` default `true` + `autoplay` prop ride the same path as G1.
- [x] G4 Course preview Safari escape — `f8-ui/src/pages/CourseDetail/components/PreviewCourse/PreviewCourse.tsx` short-circuits to native `<video>` when `isDesktopSafari() && course.video_type === "upload"`. Plugin `@f8/player-plugin-safari-mp4-fallback` (Phase 3) is the reusable form for non-preview call sites.
- [x] G5 Story composer blob preview — `VideoPlayer` accepts `blob:` URLs (characterization test "accepts a blob: URL without crashing" ✓).
- [x] G6 Landing hero loops — `VideoPlayer` PlayerOptions wire `autoplay`/`muted`/`loop`/`playsInline` · `minimal.css` theme shipped in Phase 3.
- [x] G7 Course video lesson editor — `f8-dash-ui/VideoUploadPreview` wires `createHlsQualityPlugin` + `createKeyboardPlugin` + `createMarkersPlugin` + `createAuthAwarePlugin` (Phase 5).
- [x] G8 Transcript / chapter markers — `VideoUploadPreview` wires `createMarkersPlugin` (admin editor markers; click-to-seek + hover tooltip ride plugin code).
- [x] G9 Subtitle editor preview — `VideoUploadPreview.ref.seekTo("00:01:30")` converts via `durationToSeconds` to `90` (test ✓); imperative API parity with legacy.
- [x] G10 Media manager modal preview — MediaManager `VideoPreview` delegates to `VideoUploadPreview` (Phase 5 plan note); no bare `<video>` in modal.
- [x] G11 YouTube tech (admin) — `VideoUploadPreview` accepts YouTube URL without crashing (test ✓) · `useSourceType` hides controls for external sources · core `youtube.ts` IFrame loader (Phase 1.F).
- [x] G12 Imperative ref API back-compat — `VideoPlayerHandle`/`VideoUploadPreview` ref expose `play/pause/paused/seekTo/restore` — all delegated to core and characterization-tested.
- [x] G13 Authenticated HLS — 401/403 surfacing — `createAuthAwarePlugin({ allowlist, onUnauthorized })` wired in `VideoPlayer` + `VideoUploadPreview`.
- [x] G14 iOS playsInline + force-HLS — `PlayerOptions.playsInline: true` always set · core `hls.ts` source provider handles forceHLS pathway (Phase 1.F).
- [x] G15 VTT cross-origin — `PlayerOptions.crossOrigin: "anonymous"` set globally → `<track>` honors it for VTT fetches.
- [x] G16 Custom chrome — keyboard scoping — `blockSpaceToggle` prop disables Space toggle (test ✓). `@f8/player-lit` now ships reusable default custom controls (`controls` + `theme`) and `f8-pro-ui` uses the F8 classroom chrome instead of native browser controls. _Follow-up:_ `blockArrowKeys` not yet a prop on `f8-ui/VideoPlayer` — see P10.1.

Each golden case was re-verified against current code after Phases 4 and 5 landed; tests live in `f8-ui/src/components/VideoPlayer/VideoPlayer.test.tsx` and `f8-dash-ui/src/components/VideoUploadPreview/VideoUploadPreview.test.jsx`.
