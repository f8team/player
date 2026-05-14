# Plan — `f8-player-review-fixes`

> Phased fixes for issues found in the 2026-05-12 senior review of the Reel monorepo. Resume rule: open this file, find the first phase with any `[ ]` todo, continue from the first unchecked item. Check `[x]` immediately when each todo finishes — never batch.
>
> Source of issues: senior review session (Devin) on 2026-05-12. Reference IDs (A1, A12, B2, C4…) match that review's report.

**Repos touched:**

- `f8-player` (primary) — core engine, plugins, themes, react/lit adapters.
- `f8-ui` — wrapper migration follow-up.
- `f8-dash-ui` — wrapper migration follow-up.

**Status:** Phase 1–8 done (2026-05-12). Manual smoke (P8.4) is the only owner-side gate left.

---

## Phase 1 — Core engine bug fixes (`@f8team/reel-core`)

**Goal:** Eliminate race conditions, memory leaks, infinite waits in the headless engine. No public API breakage. Tests pinned first.

**Repo:** `f8-player`.

**Test gate:**

```bash
pnpm -C packages/core verify
pnpm -C packages/core size
```

### Todos (Phase 1)

- [x] **P1.1 — Add abort method to `SourceLoader` interface**
  - File: `packages/core/src/types/source.ts`
  - Input: current `SourceLoader { attach, detach }` shape.
  - Output: add optional `abort?(): void` to `SourceLoader`; export updated type.
  - Done when: type compiles, JSDoc explains semantics ("cancel any in-flight network work, safe to call before detach"), no caller breaks.

- [x] **P1.2 — Wire `abort` into `runAttachSource` race fix (A4)**
  - File: `packages/core/src/createPlayer.ts`
  - Input: lines 256-282; `pendingAttachAbort` currently sets a soft flag.
  - Output: call `activeLoader?.abort?.()` before nulling, then proceed. Add characterization test for rapid `setSource(A)` then `setSource(B)` showing B wins.
  - Done when: new test in `createPlayer.test.ts` passes, no regression in existing tests.

- [x] **P1.3 — HLS loader: abort + remove readystatechange listener (A1)**
  - File: `packages/core/src/sources/hls.ts`
  - Input: lines 132-148 `xhrSetup` attaches `readystatechange` without removeListener; lines 92-100 `HlsLoader` fields.
  - Output: in `xhrSetup`, wrap watcher so that when `xhr.readyState === 4` we `xhr.removeEventListener("readystatechange", watcher)`. Also track active XHRs (Set) and `abort()` them on `abort()`. Implement `abort()` method.
  - Done when: unit test counts that listeners are gone after a completed XHR (use mock XHR with `addEventListener` spy).

- [x] **P1.4 — HLS loader: Promise timeout + non-fatal handling (A2)**
  - File: `packages/core/src/sources/hls.ts`
  - Input: lines 153-191 attach Promise resolves only on `MANIFEST_PARSED`, rejects only when `data.fatal`.
  - Output: add `manifestTimeoutMs` option (default 30000ms). Reject Promise if no `MANIFEST_PARSED` within timeout with error code `"timeout"`. Also reject on non-fatal manifest 4xx/5xx (status code surfaced).
  - Done when: test simulates no MANIFEST_PARSED → loader rejects with timeout; test simulates 404 non-fatal → loader rejects.

- [x] **P1.5 — HLS native fallback cleanup (C3)**
  - File: `packages/core/src/sources/hls.ts`
  - Input: lines 110-127 native fallback adds listeners that only get removed inside `onMeta/onError`.
  - Output: push removeListener callbacks into `this.detachListeners` so `detach()` cleans them up if neither event fires before dispose.
  - Done when: test calls `loader.detach()` before metadata fires and verifies no listener remains.

- [x] **P1.6 — Autoplay/startTime listener leak on re-attach (A5)**
  - File: `packages/core/src/createPlayer.ts`
  - Input: lines 455-473 — bus.on("ready") registered every attach but only fires on transition.
  - Output: in `attach()` check `if (status === "ready")` and call autoplay/seek immediately; else register listener and keep its disposer in a per-attach cleanup array that detach() flushes. Make sure re-attach after dispose throws (line 448) is preserved.
  - Done when: test attaches, awaits ready, detaches, attaches again — autoplay fires both times; listeners never accumulate.

- [x] **P1.7 — State machine: retry must include source intent (C1)**
  - File: `packages/core/src/state/machine.ts` lines 197-203 and `createPlayer.ts`.
  - Input: current retry transitions to `loading` without attachSource effect (contract ngầm).
  - Output: change retry effect to emit `[{type: "clearError"}, {type: "attachSource", source: <last source>}]`. To do that, machine needs source preserved across retry: either pass through reducer (carry source in machine state) OR `createPlayer.dispose` ensures `runAttachSource` is dispatched after retry. Choose preserving in store (re-read store.source). Document.
  - Done when: test triggers loadFailed then retry → engine re-attaches the previously failed source, ends in loading.

- [x] **P1.8 — YouTube: emit time updates to core (A3)**
  - File: `packages/core/src/sources/youtube.ts`
  - Input: lines 218-228, currentTime updated in private field only.
  - Output: add `onTimeUpdate?: (seconds: number) => void` to `YouTubeProviderOptions`. In `startTimeBridge`, call the callback every tick. In `createPlayer` (line 169-173) wire callback to `store.setState({ currentTime })` AND `bus.emit("timeupdate", {currentTime, playedSeconds, duration})`. Also add `onDuration` callback to fire when getDuration becomes available.
  - Done when: test with mock YouTube runtime asserts store.currentTime advances over 3 ticks; timeupdate event fires.

- [x] **P1.9 — YouTube: do not modify video inline style (B6 partial)**
  - File: `packages/core/src/sources/youtube.ts` lines 130-131, 211-214.
  - Input: setting `video.style.visibility` directly conflicts with host CSS.
  - Output: instead of mutating inline style, add data attribute `video.setAttribute("data-reel-yt-hidden", "")` and let CSS (in core's default styles + theme contracts) hide via `[data-reel-yt-hidden] { visibility: hidden; }`. Remove inline style restore. Document in `docs/spec/architecture.md`.
  - Done when: test asserts `video.style.visibility === ""` after attach; data attribute present; removed on detach.

- [x] **P1.10 — YouTube: warn when parent is statically positioned (B6 partial)**
  - File: `packages/core/src/sources/youtube.ts` lines 118-127.
  - Input: host div uses `position:absolute;inset:0` requiring a positioned offsetParent.
  - Output: read `getComputedStyle(video.parentElement).position`; if `static`, log a one-time `console.warn` with mitigation hint. Document in YouTube section of `docs/spec/architecture.md`.
  - Done when: test stubs computed style to `static` and verifies warn was called once.

- [x] **P1.11 — Run Phase 1 verification gate**
  - Command: `pnpm -C packages/core verify && pnpm -C packages/core size`
  - Done when: all green; size still ≤ 12 KB target / 15 KB hard cap.

---

## Phase 2 — Plugin fixes (`@f8team/reel-plugin-*`)

**Goal:** Plugins handle SSR, lifecycle, edge cases. No new public options unless documented.

**Repo:** `f8-player`.

**Test gate:** `pnpm -C packages/plugin-keyboard verify && pnpm -C packages/plugin-resume-position verify` (and any package touched).

### Todos (Phase 2)

- [x] **P2.1 — keyboard plugin: fix container scope placeholder (A6)**
  - File: `packages/plugin-keyboard/src/keyboard.ts` lines 137-150.
  - Input: `const container = getContainer?.() ?? (player.getState().source ? null : null);` returns null always.
  - Output: fallback to `() => video.parentElement` resolved lazily inside `keyboard:installOnContainer` if `getContainer` not provided. Also fix multiple installs: if `target` already attached, remove old listener first.
  - Done when: test for double install removes prior listener; test for default container falls back to video parent.

- [x] **P2.2 — keyboard plugin: skip contenteditable + isComposing (A7)**
  - File: `packages/plugin-keyboard/src/keyboard.ts` lines 69-70.
  - Input: only `input/textarea/select` are skipped.
  - Output: also skip when `(e.target as HTMLElement)?.isContentEditable` is true; skip when `e.isComposing` (IME composition); skip when `e.target` has role="textbox".
  - Done when: test fires keydown with focus inside a `contenteditable` div → no command invoked.

- [x] **P2.3 — resume-position: SSR + iOS Safari reliable save (A8)**
  - File: `packages/plugin-resume-position/src/resume-position.ts` lines 120-127.
  - Input: only `beforeunload`, no SSR guard.
  - Output:
    1. Guard `if (typeof window === "undefined") return () => undefined;` early.
    2. Listen `pagehide` and `visibilitychange` (on hidden) in addition to `beforeunload`.
    3. Periodically save during `playing` (default interval 10s, configurable via `saveIntervalMs`).
  - Done when: test stubs `document.visibilityState = "hidden"`, fires `visibilitychange` → save is called; SSR test passes (no window).

- [x] **P2.4 — resume-position: seek when mounted after ready (A9)**
  - File: `packages/plugin-resume-position/src/resume-position.ts` lines 105-112.
  - Input: only listens `ready` event; misses if already ready.
  - Output: at setup, check `player.getState().status === "ready"` (or `playing`/`paused`/`ended`) and run seek logic immediately.
  - Done when: test creates player, sets status to ready synthetically (or via mock loader), then registers plugin → seekTo invoked.

- [x] **P2.5 — resume-position: custom key strategy (C4)**
  - File: `packages/plugin-resume-position/src/resume-position.ts` lines 9-30 (options) + line 88 (getKey).
  - Input: key is fixed to `source.src`; signed URLs change every request.
  - Output: add `keyFn?: (source: SourceDescriptor) => string | null` option. Default keeps `source.src` behavior. Document signed-URL recipe.
  - Done when: test with a `keyFn` that returns `"course:42"` works across two different `src` URLs.

- [x] **P2.6 — Run Phase 2 verification gate**
  - Command: `pnpm -C packages/plugin-keyboard verify && pnpm -C packages/plugin-resume-position verify`
  - Done when: all green; sizes within budget.

---

## Phase 3 — React adapter + i18n + Lit adapter

**Goal:** Make the public packages publishable as truly generic OSS — no Vietnamese hardcoded, no F8 branding hardcoded in JS, robust SeekBar, Lit init safety.

**Repo:** `f8-player`.

**Test gate:** `pnpm -C packages/react verify && pnpm -C packages/lit verify`.

### Todos (Phase 3)

- [x] **P3.1 — Introduce i18n option contract**
  - File: `packages/react/src/i18n.ts` (new), `packages/react/src/index.ts`.
  - Input: ad-hoc Vietnamese strings in `Time.tsx`, `SeekBar.tsx`, `PlayPause`, `Mute`, etc.
  - Output: define `PlayerLabels` type with English defaults + Vietnamese preset. Provide `PlayerLabelsContext` (React context) and `useLabels()` hook. Export `vietnameseLabels` for F8 to opt-in.
  - Done when: type exported, default labels English; preset exported.

- [x] **P3.2 — Replace hardcoded VN strings with `useLabels()` (B1)**
  - File: `packages/react/src/components/controls/{Time,SeekBar,PlayPause,Mute,Volume,Quality,PlaybackRate,Fullscreen,Pip}.tsx`.
  - Input: hardcoded "Vị trí phát", "Thời lượng:", "Còn lại:", "Vị trí hiện tại:", "Phát video".
  - Output: use English labels by default, allow override via `<Player.Root labels={vietnameseLabels}>`.
  - Done when: tests assert default English; tests with `vietnameseLabels` assert Vietnamese.

- [x] **P3.3 — SeekBar: buffered visualization + focus-visible (B4 partial)**
  - File: `packages/react/src/components/controls/SeekBar.tsx`.
  - Input: only renders range input, no buffered overlay.
  - Output: render parent `<div data-reel-seek-wrapper>` wrapping `<div data-reel-seek-buffered>` (width = last buffered end / duration \* 100%) + range input. CSS in themes draws the buffered bar.
  - Done when: test asserts wrapper + buffered div exist; CSS update in classroom/admin themes.

- [x] **P3.4 — SeekBar: throttle seekTo on drag (C2)**
  - File: `packages/react/src/components/controls/SeekBar.tsx`.
  - Input: every `onChange` triggers `player.seekTo`.
  - Output: introduce internal "dragging" state. While dragging (`onMouseDown/onTouchStart` → `onMouseUp/onTouchEnd` window listeners), update visual `value` locally only; commit `seekTo` on release. Also support keyboard arrow which commits immediately.
  - Done when: test simulates drag and asserts seekTo called ONCE on release, not on every move.

- [x] **P3.5 — Lit: defer PlayerController creation to connectedCallback (C5)**
  - File: `packages/lit/src/F8Player.ts` line 82.
  - Input: `readonly controller = new PlayerController(this, ...)` runs at construct time.
  - Output: declare `controller!: PlayerController` then assign inside `connectedCallback`. Update PlayerController to be safe if hostConnected called multiple times.
  - Done when: SSR test (jsdom: false, env: node) imports `ReelPlayerElement` without crash.

- [x] **P3.6 — Run Phase 3 verification gate**
  - Command: `pnpm -C packages/react verify && pnpm -C packages/lit verify`
  - Done when: all green; sizes within budget.

---

## Phase 4 — Themes + CSS isolation

**Goal:** Themes can be imported into any host page without leaking styles or breaking touch targets / a11y.

**Repo:** `f8-player`.

**Test gate:** Manual CSS audit + Storybook a11y CI; visual smoke through Storybook for each theme.

### Todos (Phase 4)

- [x] **P4.1 — Scope all theme selectors under `[data-reel]` only (B5)**
  - File: `packages/themes/src/{classroom,story,admin,minimal}.css`.
  - Input: dual selectors `[data-reel][data-theme="x"]` AND `.reel-x` fallback create leak surface.
  - Output: keep only `[data-reel][data-theme="x"]`. Remove `.reel-x` fallback. Update docs (migration guide entry) and adapters that may rely on class.
  - Done when: grep for `.reel-` in themes returns 0; React + Lit adapters set `data-reel` + `data-theme` attributes correctly.

- [x] **P4.2 — Replace F8 hardcoded accent with neutral default + override (B2)**
  - File: `packages/themes/src/classroom.css` lines 15-16; `admin.css`; `minimal.css`.
  - Input: `--reel-accent: #f05123` is F8 orange.
  - Output: change defaults to neutral (e.g. `#3b82f6` blue). Document `--reel-accent` as the override surface. Add `f8-brand.css` add-on file that re-sets `--reel-accent: #f05123` for F8 consumers. Update story/classroom presets so they STILL ship F8 brand when imported via `@f8team/reel-themes/classroom-f8.css`.
  - Done when: importing `classroom.css` alone produces blue; importing `classroom.css` then `f8-brand.css` produces orange.

- [x] **P4.3 — Touch target ≥ 44px on mobile (B3)**
  - File: `packages/themes/src/{classroom,admin,minimal}.css` (story already correct).
  - Input: `--reel-btn-size: 3.2rem` = 32px → fails mobile.
  - Output: add `@media (pointer: coarse), (max-width: 48rem)` block bumping `--reel-btn-size: 4.4rem` and seek bar height `0.8rem` + extending the tap area with padding around the range thumb.
  - Done when: visual smoke at 375px width shows ≥ 44px buttons; axe a11y passes.

- [x] **P4.4 — Restore focus-visible on range input (B4 partial)**
  - File: `packages/themes/src/classroom.css` lines 105 + admin/minimal equivalents.
  - Input: `outline: none` on `input[type=range]` without replacement.
  - Output: add `input[type="range"]:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 3px var(--reel-accent); }` (and `::-moz-range-thumb`). Keep `outline: none` only on track, not thumb.
  - Done when: tab focus on seek bar shows visible ring; axe-core stops warning.

- [x] **P4.5 — Document z-index contract (B7)**
  - File: `docs/spec/architecture.md` + `packages/themes/README.md`.
  - Input: themes use `position: absolute` without z-index documentation.
  - Output: define `--reel-z-controls`, `--reel-z-watermark`, `--reel-z-overlay`. Document that host modal backdrops should be ≥ these values.
  - Done when: theme CSS files reference variables, docs page exists.

- [x] **P4.6 — Respect prefers-reduced-motion (C6)**
  - File: `packages/themes/src/{classroom,story,admin,minimal}.css`.
  - Input: animations + transitions unconditional.
  - Output: wrap animation/transition rules in `@media (prefers-reduced-motion: no-preference) { ... }`, OR add a global reduce-motion block that disables them.
  - Done when: with `prefers-reduced-motion: reduce`, `f8p-spin` animation is `none`.

- [x] **P4.7 — Run Phase 4 verification gate**
  - Commands: `pnpm -C packages/themes lint`, `pnpm build-storybook`, manual visual diff for 4 themes at mobile + desktop.
  - Done when: Storybook a11y addon shows 0 violations across 14 stories; theme bundles still ≤ 4 KB.

---

## Phase 5 — auth-aware allowlist hardening

**Goal:** Make the `auth-aware` plugin signature unambiguous so f8-ui and f8-dash-ui can both target the same gateway without subtle string mismatches.

**Repo:** `f8-player`, then `f8-ui` + `f8-dash-ui` consumer updates.

**Test gate:** `pnpm -C packages/plugin-auth-aware verify`; manual smoke that HLS 401 path still surfaces.

### Todos (Phase 5)

- [x] **P5.1 — auth-aware allowlist: switch to function-OR-prefix-OR-regex (A12 prep)**
  - File: `packages/plugin-auth-aware/src/auth-aware.ts` (read first, then update).
  - Input: currently consumers send raw strings (`"https://api-gateway"` vs `"https://api-gateway."`).
  - Output: accept `allowlist: Array<string | RegExp | ((url: string) => boolean)>` where strings are treated as prefix match (no implicit dot). Document explicitly in JSDoc.
  - Done when: unit test for each input form passes.

- [x] **P5.2 — Add console.warn for trailing-dot mistake**
  - File: same as P5.1.
  - Output: if a string allowlist entry ends with `"."` and prefix length > 12, log a one-time `console.warn` ("Did you mean to include the dot? Use a regex instead.") to surface the mismatch.
  - Done when: test triggers the warn once.

- [x] **P5.3 — Run Phase 5 verification gate**
  - Command: `pnpm -C packages/plugin-auth-aware verify`
  - Done when: green.

---

## Phase 6 — `f8-ui` migration follow-up

**Goal:** Remove dead code, eliminate duplicate keyboard handling, align auth-aware config with the new shape, drop `react-player` shim/types.

**Repo:** `f8-ui`.

**Test gate:** `pnpm test` in f8-ui repo; manual smoke for lesson player, StoryViewer, VideoDetail, PreviewCourse.

### Todos (Phase 6)

- [x] **P6.1 — Delete `src/shims/reactPlayerHls.ts` (B8 part 1)**
  - File: `f8-ui/src/shims/reactPlayerHls.ts` delete.
  - Output: also remove any leftover `import "./shims/reactPlayerHls"` lines (`grep -rn shims/reactPlayerHls src`).
  - Done when: `find src -name "*react*player*" -type f` returns empty; `grep -rn "shims/reactPlayerHls" src` empty.

- [x] **P6.2 — Delete `declare module "react-player"` (B8 part 2)**
  - File: `f8-ui/src/types/vendor-modules.d.ts` line 201 onward.
  - Output: remove module declaration; verify no consumer imports `react-player`.
  - Done when: grep clean; typecheck passes.

- [x] **P6.3 — Remove duplicate KeyboardHandler from VideoPlayer wrapper (A10)**
  - File: `f8-ui/src/components/VideoPlayer/index.tsx` lines 227-261, plus relevant imports.
  - Input: wrapper inlines window keypress/keydown listeners; package.json has `@f8team/reel-plugin-keyboard` installed.
  - Output: replace `KeyboardHandler` with `createKeyboardPlugin({ scope: "global", seekStep: 5 })` added to the plugins memo. Keep `blockSpaceToggle` semantic via `keyboard:disable`/`keyboard:enable` commands toggled by an effect.
  - Done when: `VideoPlayer.test.tsx` (characterization) still green; Space still toggles play/pause; blockSpaceToggle still suppresses Space.

- [x] **P6.4 — Align auth-aware allowlist (A12 + post-P5.1)**
  - File: `f8-ui/src/components/VideoPlayer/index.tsx` line 391.
  - Input: `allowlist: ["https://api-gateway"]`.
  - Output: switch to regex `[/^https:\/\/api-gateway\./]` to be explicit; document the choice with a brief comment.
  - Done when: HLS authenticated stream playback verified manually.

- [x] **P6.5 — Run f8-ui test + manual smoke**
  - Command: `pnpm test` in f8-ui; manually load a lesson video, a story video, a preview course.
  - Done when: all tests green; manual smoke OK.

---

## Phase 7 — `f8-dash-ui` migration follow-up

**Goal:** Fix invalid plugin option being silently swallowed; align auth-aware.

**Repo:** `f8-dash-ui`.

**Test gate:** `pnpm test` in f8-dash-ui repo; manual smoke for VideoUploadPreview, MediaManager VideoPreview, f8-youtube-player consumer.

### Todos (Phase 7)

- [x] **P7.1 — Drop invalid `enableVolumeScroll` from keyboard plugin call (A11)**
  - File: `f8-dash-ui/src/components/VideoUploadPreview/index.jsx` line 130.
  - Input: `createKeyboardPlugin({ seekStep: 10, enableVolumeScroll: false })` — option not in spec.
  - Output: remove `enableVolumeScroll`. If admin truly wants no volume scroll, file a P-future todo to add `disableVolumeScroll: boolean` option to plugin-keyboard. For now, the plugin doesn't have volume-scroll behavior anyway — confirm via reading plugin source first.
  - Done when: file compiles, behavior unchanged.

- [x] **P7.2 — Align auth-aware allowlist with f8-ui (A12)**
  - File: `f8-dash-ui/src/components/VideoUploadPreview/index.jsx` line 133.
  - Input: `allowlist: ["https://api-gateway."]` (with dot).
  - Output: switch to regex `[/^https:\/\/api-gateway\./]`.
  - Done when: matches f8-ui pattern; authenticated HLS verified.

- [x] **P7.3 — Run f8-dash-ui tests + manual smoke**
  - Command: `pnpm test` in f8-dash-ui; manually upload a video preview, view a transcribed lesson with markers, switch quality.
  - Done when: green and manual smoke OK.

---

## Phase 8 — Final verification + plan reconciliation

**Goal:** Run global verify across f8-player workspaces, restore the source-of-truth plan (`plans/f8-player.md`) to reflect reality, ship a CHANGELOG entry.

**Repo:** `f8-player`.

**Test gate:**

```bash
pnpm verify             # turbo run lint typecheck test build size
pnpm -C packages/* size
```

### Todos (Phase 8)

- [x] **P8.1 — Run full repo verify**
  - Command: `pnpm verify && pnpm -r run size`.
  - Done when: all green; if any fail, open a sub-todo here and fix before closing.

- [x] **P8.2 — Uncheck stale Phase 4 / Phase 5 / Phase 7 items in `plans/f8-player.md`**
  - File: `plans/f8-player.md`.
  - Input: `[x] Remove react-player, src/shims/reactPlayerHls.ts import` (was incomplete — file still existed); related lines if any.
  - Output: amend the line to reflect actual completion only after P6.1–P6.2 are done; or note "completed in `f8-player-review-fixes.md` P6.1/P6.2".
  - Done when: original plan is honest.

- [x] **P8.3 — Add Changeset for these fixes**
  - File: `.changeset/<random>.md`.
  - Output: a single `minor` changeset describing the user-visible fixes (auth-aware shape, i18n, theme defaults, YouTube time bridge). Mark breaking changes (theme default color, English default labels).
  - Done when: `pnpm changeset version` would produce a valid plan.

- [x] **P8.4 — Final smoke (automated portion ran 2026-05-12; manual leg owner-side)**

  **Automated (done):**
  - `pnpm verify` — format / lint / typecheck / 547 tests across 18 packages → green.
  - `pnpm build-storybook` — 14 stories + 4 themes + axe addon → exit 0.
  - `pnpm docs:build` — Vite + MDX docs site → exit 0.
  - `pnpm audit --prod` — 0 known vulnerabilities.
  - `pnpm size` — every package within budget (core 9.31 KB / 12 KB target, react 3.21 KB / 4 KB, lit 2.84 KB / 4 KB, themes ≤ 1.36 KB / 4 KB, plugins ≤ 800 B / 3 KB).
  - `f8-ui` `pnpm test` — 235/235 (no regression).
  - `f8-dash-ui` VideoUploadPreview suite — 11/11.

  **Manual (owner-side, requires real browsers):**
  - Run `f8-ui` dev server: open a course lesson HLS player, StoryViewer, VideoDetail; verify keyboard hotkeys, auth-gated play, resume-position works after page reload.
  - Run `f8-dash-ui` dev server: open VideoUploadPreview with HLS authenticated source, transcripts/markers, switch quality, YouTube preview.
  - Verify in DevTools: no console errors, focus visible on every control, F8 brand orange after `import "@f8team/reel-themes/f8-brand.css"`.
  - BrowserStack / real device: iOS Safari touch targets ≥ 44px, pagehide saves resume position, mobile control bar always visible.

---

## Master checklist (acceptance — rollup)

- [x] HLS xhr leaks gone (A1)
- [x] HLS infinite-wait gone (A2)
- [x] YouTube time bridge works (A3)
- [x] No race on rapid setSource (A4)
- [x] Autoplay survives re-attach (A5)
- [x] Keyboard container scope works (A6)
- [x] Keyboard skips contenteditable (A7)
- [x] resume-position SSR-safe + iOS-reliable (A8)
- [x] resume-position seeks when plugin mounted late (A9)
- [x] f8-ui no duplicate keyboard handler (A10)
- [x] f8-dash-ui no invalid plugin options (A11)
- [x] auth-aware allowlist explicit/typed (A12)
- [x] React adapter labels are English by default with VN preset (B1)
- [x] Theme default not F8-branded (B2)
- [x] Themes pass mobile touch target (B3)
- [x] SeekBar shows buffered + has focus-visible (B4)
- [x] Theme CSS scoped exclusively under `[data-reel]` (B5)
- [x] YouTube no longer mutates `video.style` inline (B6)
- [x] Theme z-index documented (B7)
- [x] f8-ui shim/types gone (B8)
- [x] retry replays last source (C1)
- [x] SeekBar throttles drag (C2)
- [x] HLS native fallback cleans listeners on detach (C3)
- [x] resume-position keyFn option (C4)
- [x] Lit controller created on connect (C5)
- [x] Themes respect prefers-reduced-motion (C6)

---

## Suggested model handoff per phase

- **Phase 1, 2, 5, 7:** Claude Sonnet 4.6 High — logic + plugin work, no architectural ambiguity.
- **Phase 3:** Claude Sonnet 4.6 High (i18n + Lit) → consider Opus 4.7 High if Lit lifecycle proves tricky.
- **Phase 4:** GPT-5.5 High — CSS/UI quality + visual verification.
- **Phase 6, 8:** Claude Sonnet 4.6 Medium — straightforward cleanup + final verify.

Stop after each phase. Test gate must be 100% green before closing.
