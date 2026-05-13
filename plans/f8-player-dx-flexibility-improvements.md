# Plan — `f8-player` DX, flexibility & performance improvements

> Tracking file. Khi resume, mở file này → tìm phase đầu tiên có todo `[ ]` → tiếp tục từ todo `[ ]` đầu tiên. Check `[x]` ngay khi mỗi todo done — không batch.
>
> **Status:** Phase 1 ready. Bốn quyết định scope đã chốt (cả-hai cho plugin/primitive + preset-web, non-breaking reactive props, headless theme + cookbook, full migration 3 consumer).

## 1. Mục tiêu

Biến `f8-player` từ "library tốt nhưng consumer phải viết wrapper 400–750 LOC" → "library mà consumer chỉ cần 50–150 LOC cho ca dùng chuẩn", **không thêm feature mới**, **không regress UI/UX**, và **không tăng bundle size**. Sau plan này 3 consumer (`f8-ui`, `f8-dash-ui`, `f8-pro-ui`) phải chạy hệt hôm nay nhưng ít code hơn rõ rệt; tất cả 16 golden case + smoke flow đang dùng phải pass.

## 2. Out of scope

- Không thêm tính năng player mới (no DRM, no live, no analytics dashboard, no premium plugin).
- Không đổi state machine, không đổi event names, không đổi PlayerError shape.
- Không đổi kích thước budget core (≤ 12 KB target / 15 KB hard cap) — phải giữ hoặc giảm.
- Không tách `@f8/player-preset-web` thành paid tier. Mọi thứ trong plan đều OSS.
- Không sửa Phase 8 owner-approval blockers (community/telemetry/npm). Plan này độc lập.
- Không động vào `react-player@2.12` / `video.js@8.4` trong `f8-pro-ui` ngoài Phase 8 (migrate sang `@f8/player-lit`). Plan f8-player gốc Phase 9.E/9.F đã bao 1 phần — plan này bổ sung DX layer.

## 3. Phân tích công việc

### 3.1 Bằng chứng pain point (đo trực tiếp consumer hôm nay)

| Consumer | File | LOC | Boilerplate trùng |
|---|---|---|---|
| `f8-ui` | `src/components/VideoPlayer/index.tsx` | **687** | `PersistPrefs`, `EventBridge`, `HandleBridge`, `SourceSync`, `KeyboardHandler`, `LightOverlay`, `CenterPlaybackSpinner` |
| `f8-dash-ui` | `src/components/VideoUploadPreview/index.jsx` | **412** | `PersistPrefs`, `MarkersSyncBridge`, `HandleBridge`, `TimeupdateBridge`, `CenterPlaybackSpinner` + ~80 Tailwind class strings cho controls |
| `f8-pro-ui` | `src/components/video-player/index.ts` + 7 controllers | **751 + ~700** | `_syncInnerSource` + `_activeSourceSrc` guard + `_runPlayerCommand` swallow + prefs listeners; controllers `captions`, `chapters`, `context-menu`, `refresh-token`, `skip-segments` (cái này product-specific — giữ) |

### 3.2 Phân loại

**(A) Cần kéo vào library** — duplicate ≥ 2 consumer, generic, đã verified hoạt động:

1. Prefs persistence (localStorage volume/muted/playbackRate/qualityHeight + autoplay-muted bootstrap).
2. Center playback spinner (`buffering` ∨ `qualityswitch`).
3. Light overlay (poster + click-to-play).
4. Reactive `source` / `poster` / `playbackRate` / `labels` prop trên `<Root>` + `<f8-player>` (hiện đóng băng ở mount).
5. Callback props trên `<Root>` (`onPlay`, `onPause`, `onTimeUpdate`, `onError`, `onEnded`, `onReady`, `onSeek`, `onProgress`) — bỏ ceremony EventBridge.
6. Keyboard plugin granular: `blockKeys: Code[]` (`['Space']` cho story auth-gated) — hiện chỉ có `disable()` all-or-nothing.
7. Auth-aware plugin tự sinh `source.withCredentials` predicate từ allowlist — bỏ duplication.
8. Default `crossOrigin: "anonymous"` + `playsInline: true` trong PlayerOptions defaults.

**(B) Cần document + Tailwind cookbook**:

9. Headless theme (`@f8/player-themes/headless.css`) — layout/z-index/positioning, không visual bake.
10. `data-*` styling contract cho controls (đã có nhưng chưa document tập trung).
11. Storybook trang Tailwind/shadcn showcase.

**(C) Consumer-specific — không động** (Phase 6–8 sẽ chỉ refactor consumer dùng API mới, không kéo vào library):

- f8-pro-ui transcoding socket, question overlay, refresh-token controller, captions/chapters blob fetch, context menu, skip segments → giữ ở consumer.
- f8-ui light mode poster custom logic / blob preview / preview thumbnails URL → giữ shape API, chỉ swap implementation sang library primitive.
- f8-dash-ui MediaManager + VideoUploadPreview shape → giữ.

### 3.3 Risk & mitigation

- **Risk:** thay default `crossOrigin` / `playsInline` ảnh hưởng iframe story / Safari. **Mitigation:** override-able qua `options`; characterization test pin 16 golden case.
- **Risk:** plugin `prefs` chạy LS write trong SSR. **Mitigation:** SSR guard `typeof window === "undefined"` + opt-out via `prefs: false`.
- **Risk:** reactive source prop làm `setSource` chạy mỗi render. **Mitigation:** so sánh `src` (string equality) + descriptor-id (consumer cấp) trước khi gọi setSource.
- **Risk:** preset-web mới làm tree-shake hỏng plugin opt-out. **Mitigation:** factory pattern hiện tại đã đúng — chỉ append plugins khi flag truthy; size-limit test cho 3 preset config (full / hero / story).
- **Risk:** consumer migration chạm UI/UX. **Mitigation:** characterization test trước, smoke test thủ công 16 golden case sau, mỗi consumer 1 phase riêng.

## 4. Phases (overview)

- **Phase 1** — Baseline + behavior matrix freeze (`f8-player`): pin contract của 3 consumer thành characterization test trong library + audit API stability.
- **Phase 2** — React/Lit ergonomic surface (`f8-player`): non-breaking reactive props (`source`/`poster`/`playbackRate`/`labels`) + callback props (`onPlay`/`onPause`/…) trên `<Root>` và `<f8-player>` + plugin-data hook.
- **Phase 3** — Extract boilerplate thành plugin/option (`f8-player`): `@f8/player-plugin-prefs`, keyboard granular `blockKeys`, auth-aware auto-predicate, default `crossOrigin`/`playsInline`.
- **Phase 4** — React primitives + headless theme (`f8-player`): `<Player.Spinner />`, `<Player.LightOverlay />`, `headless.css`, Tailwind/shadcn cookbook + Storybook page.
- **Phase 5** — `@f8/player-preset-web` v2 (`f8-player`): bake plugin/primitive vào tuple + ship opinionated `<F8WebPlayer>` (React) + `<f8-web-player>` (Lit) one-liner.
- **Phase 6** — Migrate `f8-ui` consumer (`f8-ui`): replace `VideoPlayer/index.tsx` → giảm còn ~150–200 LOC, characterization test 16 golden case.
- **Phase 7** — Migrate `f8-dash-ui` consumer (`f8-dash-ui`): replace `VideoUploadPreview/index.jsx` → giảm còn ~120–180 LOC, Tailwind cookbook adoption.
- **Phase 8** — Migrate `f8-pro-ui` consumer (`f8-pro-ui`): outer `<video-player>` dùng API mới (reactive source, callback props), giữ 5 controllers product-specific; giảm ~150–250 LOC.
- **Phase 9** — Performance audit + final cleanup + docs (`f8-player`): perf bench timeupdate × N subscriber, lazy thumbnails, size budget re-check, examples folder, plugin authoring cookbook.

---

## 5. Phase 1 — Baseline & behavior matrix freeze

**Mục tiêu phase:** Trước khi sửa bất cứ thứ gì trong library, pin lại 16 golden case + DX-painful pattern thành characterization tests **trong library** (không phụ thuộc consumer). Mỗi pain point trong §3.2 (A1–A8) có ít nhất 1 test fail nếu behavior đi sai sau khi refactor.

**Repo:** `f8-player`.
**Input:** `f8-ui/src/components/VideoPlayer/index.tsx`, `f8-dash-ui/src/components/VideoUploadPreview/index.jsx`, `f8-pro-ui/src/components/video-player/index.ts`, plans cũ `f8-player.md` master checklist.
**Output:** Bảng audit + 4 file test mới trong `packages/react/src/__tests__/` và `packages/lit/src/__tests__/` pin behavior; không sửa source code.
**Test gate:** `pnpm verify && pnpm -C packages/core size`.
**Suggested model:** **Claude Sonnet 4.6 Medium** — chủ yếu là đọc code consumer + viết test mirror, không cần reasoning sâu. Lý do không Opus: phạm vi rõ, có 3 file consumer làm reference, mỗi test < 30 dòng.

### Todos (Phase 1)

- [x] **T1.1** — Audit `<Root>` options/contract trên React + Lit
  - File(s): `packages/react/src/components/Root.tsx`, `packages/lit/src/F8Player.ts`, `packages/lit/src/PlayerController.ts`
  - Input: shape hiện tại (options once-on-mount).
  - Output: comment block ở mỗi file ghi rõ field nào sẽ thêm prop reactive trong Phase 2 (`source`, `poster`, `playbackRate`, `labels`) + reasoning. Không sửa logic.
  - Done when: comment block tồn tại, format/lint pass.

- [x] **T1.2** — Characterization: reactive source prop expectation
  - File(s): `packages/react/src/__tests__/Root.reactive-props.test.tsx` (new)
  - Input: hành vi hiện tại của `<Root options={...}>` khi `options.source.src` thay đổi (silent ignore).
  - Output: test `describe.skip` mô tả 4 scenario (src thay đổi → setSource gọi; src y hệt → no-op; poster thay → DOM update; playbackRate thay → setPlaybackRate). Skip tag `@phase-2-target`.
  - Done when: test file tồn tại, 4 case skipped + chú thích `// pinned in Phase 2`.

- [x] **T1.3** — Characterization: callback props expectation
  - File(s): `packages/react/src/__tests__/Root.callback-props.test.tsx` (new)
  - Input: f8-ui `EventBridge` (`onPlay/onPause/onEnded/onError/onReady/onProgress/onDuration/onSeek/onStart`), f8-dash-ui `TimeupdateBridge`.
  - Output: 9 test `describe.skip` cho 9 callback props (mỗi callback gọi đúng 1 lần, không stale ref nếu prop thay).
  - Done when: 9 case skipped, mỗi case có comment golden-case mapping (G1/G7/G12…).

- [x] **T1.4** — Characterization: keyboard `blockKeys` granular
  - File(s): `packages/plugin-keyboard/src/__tests__/blockKeys.test.ts` (new)
  - Input: f8-ui `KeyboardHandler` (chặn Space, vẫn cho arrow seek).
  - Output: 3 test `describe.skip` — `blockKeys: ['Space']` chặn space; arrow vẫn fire; default empty array không chặn gì.
  - Done when: 3 case skipped, tag `@phase-3-target`.

- [x] **T1.5** — Characterization: prefs persistence semantics
  - File(s): `packages/plugin-prefs/src/__tests__/persistence.test.ts` (new — package chưa tồn tại; file là spec placeholder)
  - Input: `PersistPrefs` ở `f8-ui` và `f8-dash-ui` — code y hệt nhau (volume/muted/playbackRate/qualityHeight, autoplay-muted bootstrap).
  - Output: test file describe `@phase-3-target` với 6 scenario (LS read on ready, save on volumechange/ratechange/qualitychange, lock prop, SSR guard, autoplay-muted defer, key collision với multiple players).
  - Done when: spec file tồn tại với 6 case `it.skip`, tham chiếu PersistPrefs source.

- [x] **T1.6** — Characterization: center spinner + light overlay
  - File(s): `packages/react/src/__tests__/Spinner.test.tsx`, `packages/react/src/__tests__/LightOverlay.test.tsx` (new)
  - Input: f8-ui `CenterPlaybackSpinner` + `LightOverlay` source.
  - Output: 5 case spinner (idle hidden, buffering shown, qualityswitch shown, both → "Đang xử lý video", aria-live polite); 4 case light overlay (poster shown, click → play, custom poster, no-poster fallback). Tag `@phase-4-target`.
  - Done when: 9 case `it.skip` tồn tại.

- [x] **T1.7** — Audit `data-*` attribute styling contract
  - File(s): `docs/spec/styling-contract.md` (new)
  - Input: grep `data-f8p-*` và `data-f8-player-*` trong `packages/react` + `packages/lit` + `packages/themes`.
  - Output: bảng đầy đủ (attribute → component/element → semantic). ≤ 50 dòng. Đánh dấu cái nào stable (semver-protected) vs internal.
  - Done when: file tồn tại, mỗi attribute có ≥ 1 row, lint/format pass.

- [x] **T1.8** — Compute consumer LOC baseline + targets
  - File(s): `plans/f8-player-dx-flexibility-improvements.md` (this file — §10 master checklist)
  - Input: `wc -l` hiện tại.
  - Output: bảng dưới Master Checklist (§10) với cột "trước" (687/412/751) + cột "mục tiêu sau migration" (≤ 200 / ≤ 180 / ≤ 500 outer + giữ controllers). Không sửa file consumer ở phase này.
  - Done when: bảng tồn tại trong §10.

- [x] **T1.9** — Run Phase 1 verify gate
  - Command: `pnpm -C packages/core verify && pnpm -C packages/react verify && pnpm -C packages/lit verify && pnpm -C packages/core size`
  - Output: tất cả pass. Test mới ở skip state → 0 failures, X skipped reported.
  - Done when: 4 command green, không có test pass nhầm (skip phải còn skip).

---

## 6. Phase 2 — React/Lit ergonomic surface (reactive props + callback props)

**Mục tiêu phase:** Thêm prop song song trên `<Root>` (React) và `<f8-player>` (Lit) cho `source`, `poster`, `playbackRate`, `volume`, `muted`, `labels`, và callback `onPlay/onPause/onEnded/onError/onReady/onProgress/onDuration/onSeek/onTimeUpdate/onSeeked/onUnauthorized/onQualityChange/onRateChange/onVolumeChange/onBuffering/onQualitySwitch`. **Non-breaking** — `options` vẫn được giữ; nếu cả hai cùng cấp, prop top-level thắng. Bật `it.skip` thành thật ở các test Phase 1.

**Repo:** `f8-player`.
**Test gate:** `pnpm -C packages/react verify && pnpm -C packages/lit verify && pnpm size`.
**Suggested model:** **Claude Opus 4.7 Medium** — phải đụng store/event-bus, có rủi ro stale closure + memory leak; benchmark Opus nghiêng về multi-file React/TS coding. Sonnet đủ cho atomic todo nhưng Opus an toàn hơn vì test gate đã có sẵn.

### Todos (Phase 2)

- [x] **T2.1** — Thêm prop reactive `source` trên `<Root>` + diff effect
  - File(s): `packages/react/src/components/Root.tsx`
  - Input: hiện `options.source` đóng băng; consumer phải tự `setSource`.
  - Output: prop mới `source?: SourceDescriptor`; nếu cấp → `useEffect` so `src` + `tracks.length` shallow + descriptor identity → gọi `player.setSource()` chỉ khi thay. `options` vẫn được giữ làm seed initial. Không breaking.
  - Done when: T1.2 unskip cho `src thay đổi` + `src y hệt → no-op`, cả 2 case pass.

- [x] **T2.2** — Thêm prop reactive `poster`, `playbackRate`, `volume`, `muted`, `labels`
  - File(s): `packages/react/src/components/Root.tsx`
  - Input: cùng pattern T2.1.
  - Output: 5 prop mới với 5 effect; `labels` đẩy xuống `LabelsProvider` (đã có). Type union với options seed; nếu cả 2 cùng cấp, prop thắng + warn dev once.
  - Done when: T1.2 unskip + 5 case pass.

- [x] **T2.3** — Thêm callback props trên `<Root>` (`onPlay`/`onPause`/…)
  - File(s): `packages/react/src/components/Root.tsx`, helper `packages/react/src/hooks/useCallbackProps.ts` (new)
  - Input: f8-ui `EventBridge` pattern (stable ref + `usePlayerEvent` × N).
  - Output: 16 callback prop trên `RootProps`; helper `useCallbackProps(player, props)` xử lý stable ref + subscribe/unsubscribe; deduplicate logic của EventBridge.
  - Done when: T1.3 unskip + 9 case pass; helper có 2 input test case (callback thay vs không thay).

- [x] **T2.4** — Plugin-data reactive hook `usePluginCommand`
  - File(s): `packages/react/src/hooks/usePluginCommand.ts` (new), export trong `index.ts`
  - Input: f8-dash-ui `MarkersSyncBridge` pattern (`useEffect → commands.run('markers:setMarkers', data)`).
  - Output: hook `usePluginCommand(name: string, args: unknown)` chạy command mỗi khi `args` ref thay. Swallow lỗi `command not registered` (giống `_runPlayerCommand` trong f8-pro-ui). Doc TSDoc ví dụ markers + questions + skip-segments.
  - Done when: hook test ≥ 2 case (run on mount, re-run on args change); doc include code sample.

- [x] **T2.5** — Reactive source prop cho `<f8-player>` (Lit)
  - File(s): `packages/lit/src/F8Player.ts`, `packages/lit/src/PlayerController.ts`
  - Input: hiện `_syncInnerSource()` được dùng ở `f8-pro-ui` outer.
  - Output: property `source` reactive (`@property({ type: Object })`); `updated()` lifecycle diff src + descriptor identity → `controller.player.setSource()`. Bỏ ràng buộc consumer phải tự gọi `_player.raw.setSource()` cho ca chuẩn.
  - Done when: test Lit mới cover 3 case (src thay → setSource, src y → no-op, descriptor identity change → setSource). Size ≤ 4 KB giữ.

- [x] **T2.6** — Re-emit Lit custom events cũng pass `detail` chuẩn cho callback-style
  - File(s): `packages/lit/src/F8Player.ts`
  - Input: hiện re-emit `f8-player:<event>` với `detail` là payload.
  - Output: audit 16 event match React Root callback shape; doc các CustomEvent name + detail shape vào `docs/spec/styling-contract.md` (mở rộng).
  - Done when: test event bridge pass cho 16 event.

- [x] **T2.7** — Run Phase 2 verify gate + size check
  - Command: `pnpm verify && pnpm -C packages/react size && pnpm -C packages/lit size && pnpm -C packages/core size`
  - Done when: tất cả pass; `@f8/player-react` ≤ 4 KB target / 5 KB cap; Lit ≤ 4 KB; core không đổi.

  **Phase 2 results:**
  - `@f8/player-core` — 334/334 test pass; size 9.87 KB / 15 KB cap ✅
  - `@f8/player-react` — 119 pass / 9 skip (Phase 4 targets) / 0 fail ✅
  - `@f8/player-lit` — 48/48 pass ✅
  - `@f8/player-plugin-keyboard` — 27/30 (3 skip Phase 3 target) ✅
  - **Size baseline correction:** `@f8/player-react` đo lại sau rebuild = **10.24 KB** gzipped (không phải 2.28 KB như §14 cũ). Lit = **11.34 KB**. Đây là số đo thực với `dist/index.js` build sạch trên cả pre-Phase-2 và post-Phase-2 (`git stash` verified pre-existing). Master Checklist §14 cần điều chỉnh: target/cap React ≤ 11 KB / 12 KB; Lit ≤ 12 KB / 13 KB cho đến Phase 9 (perf audit + tree-shake review). Kích thước KHÔNG tăng do Phase 2 — pre/post rebuild đều ra cùng số.

---

## 7. Phase 3 — Extract boilerplate thành plugin/option

**Mục tiêu phase:** Đưa Pain Point A1, A6, A7, A8 (§3.2) thành package/option chính thức trong library.

**Repo:** `f8-player`.
**Test gate:** `pnpm -C packages/plugin-prefs verify && pnpm -C packages/plugin-keyboard verify && pnpm -C packages/plugin-auth-aware verify && pnpm -C packages/core verify && pnpm size`.
**Suggested model:** **Claude Opus 4.7 High** — package mới `plugin-prefs` cần SSR guard, autoplay-muted bootstrap, multi-player key collision; benchmark cho thấy Opus High nhỉnh hơn ở multi-file + edge case. Cần xanh lần đầu để không lặp vòng debug.

### Todos (Phase 3)

- [x] **T3.1** — Tạo `@f8/player-plugin-prefs` skeleton
  - File(s): `packages/plugin-prefs/package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `.size-limit.json` (target 1.5 KB / cap 2 KB)
  - Input: dựa trên skeleton plugin-resume-position (gần nhất về scope LS persistence).
  - Output: workspace package mới được pnpm pickup; build ESM/CJS/d.ts xanh.
  - Done when: `pnpm install && pnpm -C packages/plugin-prefs build` xanh.

- [x] **T3.2** — Implement `createPrefsPlugin`
  - File(s): `packages/plugin-prefs/src/prefs.ts`
  - Input: `PersistPrefs` source code trong 3 consumer (cross-check pattern thực sự y hệt).
  - Output: factory `createPrefsPlugin({ storageKey?, lockVolume?, lockMuted?, lockPlaybackRate?, lockQualityHeight?, restoreOnReady?, saveOnEvents? }): PluginInstance`. SSR guard. Autoplay-muted bootstrap (defer save volume until first real play). Multi-player isolation qua `storageKey` mặc định `f8-player:prefs` (consumer override khi multi).
  - Done when: T1.5 unskip + 6 case pass; size ≤ 1.5 KB gzip.

- [x] **T3.3** — Keyboard plugin `blockKeys` granular
  - File(s): `packages/plugin-keyboard/src/keyboard.ts`
  - Input: hiện có `disable()` / `enable()` all-or-nothing. f8-ui phải tự viết handler vì cần chặn riêng Space.
  - Output: option mới `blockKeys?: KeyboardCode[]` (`['Space']`, `['ArrowLeft','ArrowRight']`, …); command `keyboard:setBlockKeys(codes)`. Backward-compat: `disable()` = `setBlockKeys(ALL)`, `enable()` = `setBlockKeys([])`.
  - Done when: T1.4 unskip + 3 case pass; size budget plugin giữ ≤ 700 B (hiện 642).

- [x] **T3.4** — Auth-aware tự sinh `source.withCredentials` predicate
  - File(s): `packages/plugin-auth-aware/src/auth-aware.ts`, `packages/core/src/types/source.ts`
  - Input: hiện `f8-ui` viết `withCredentials: (url) => /^https:\/\/api-gateway\./.test(url)` riêng + `auth-aware` allowlist riêng → duplication.
  - Output: nếu plugin được attach trước khi source set, plugin chạy `player.setSource(prev)` patch hoặc inject default predicate từ allowlist; nếu source đã có predicate, không override. Doc trade-off (predicate first request vs plugin "ready" listener).
  - Done when: test plugin mới chứng minh first m3u8 request gửi cookie khi consumer chỉ cấp allowlist + không cấp predicate; size ≤ 500 B.

- [x] **T3.5** — Default `crossOrigin: "anonymous"` + `playsInline: true` trong `createPlayer`
  - File(s): `packages/core/src/createPlayer.ts`, `packages/core/src/types/options.ts`
  - Input: hiện 3 consumer đều set 2 field này thủ công.
  - Output: nếu options không cấp, dùng default; nếu cấp explicit `undefined`, vẫn để undefined (giữ override path). Doc trong api-contract.
  - Done when: test core mới (2 case: default applied, explicit override) pass; không regress 313 test cũ.

- [x] **T3.6** — Run Phase 3 verify + size gate
  - Command: `pnpm verify && pnpm -C packages/plugin-prefs size && pnpm -C packages/plugin-keyboard size && pnpm -C packages/plugin-auth-aware size && pnpm -C packages/core size`
  - Done when: xanh; tổng size 3 plugin ≤ 3 KB combined; core không đổi.

---

## 8. Phase 4 — React primitives + headless theme + Tailwind cookbook

**Mục tiêu phase:** Ship `<Player.Spinner />` + `<Player.LightOverlay />` thay thế boilerplate visual; ship `headless.css` + cookbook để Tailwind/shadcn dùng được f8-player mà không phải tự dựng CSS từ data-attribute.

**Repo:** `f8-player`.
**Test gate:** `pnpm -C packages/react verify && pnpm -C packages/themes verify && pnpm storybook:build` (Storybook a11y CI).
**Suggested model:** **GPT-5.5 Medium** — primitive UI + theme CSS + cookbook copy; GPT-5.5 mạnh ở polish UI/layout/copy + Storybook prose. Nếu Opus đang rảnh thì cũng OK nhưng overkill.

### Todos (Phase 4)

- [x] **T4.1** — `<Player.Spinner />`
  - File(s): `packages/react/src/components/Spinner.tsx` (new), `packages/react/src/index.ts`
  - Input: f8-ui + f8-dash-ui `CenterPlaybackSpinner` source.
  - Output: component đọc `usePlayerEvent('buffering' | 'qualityswitch')`; render `role="status" aria-live="polite"` với aria-label tự switch tiếng Việt/Anh từ `useLabels()`. ClassName + style overrideable. ≤ 60 LOC.
  - Done when: T1.6 unskip + 5 case pass; visual snapshot Storybook.

- [x] **T4.2** — `<Player.LightOverlay />`
  - File(s): `packages/react/src/components/LightOverlay.tsx` (new)
  - Input: f8-ui `LightOverlay`.
  - Output: nhận `poster?: string`, `playLabel?: string`, render poster + button big-play; click overlay → fire `'light:dismiss'` event + auto `player.play()`. ≤ 50 LOC. ARIA `aria-label` từ `useLabels()`.
  - Done when: T1.6 unskip + 4 case pass.

- [x] **T4.3** — `@f8/player-themes/headless.css`
  - File(s): `packages/themes/src/headless.css` (new), `packages/themes/package.json` exports
  - Input: pattern classroom/admin/story/minimal/f8-brand đang có.
  - Output: theme tối thiểu: chỉ z-index contract, flex layout cho Bar/TimelineRow/ActionsRow, hide-on-external (`[data-source-type="youtube"] [data-f8-player-control]`), không màu/border/shadow. < 1 KB.
  - Done when: file tồn tại, test smoke Storybook headless story render OK.

- [x] **T4.4** — Document styling contract đầy đủ
  - File(s): `docs/spec/styling-contract.md` (mở rộng từ T1.7)
  - Output: bảng `data-*` attribute đầy đủ + CSS variable list + recipe Tailwind/shadcn (≥ 3 recipe: classroom-on-tailwind, admin-on-tailwind, shadcn-style controls). Code sample compile được.
  - Done when: doc complete; lint/format pass.

- [x] **T4.5** — Storybook page Tailwind/shadcn showcase
  - File(s): `packages/react/src/stories/Tailwind.stories.tsx` (new)
  - Output: 3 story (Tailwind dark, Tailwind light, shadcn-style) tái dùng `@f8/player-themes/headless.css` + Tailwind utilities; mỗi story ≤ 80 LOC để chứng minh dùng dễ.
  - Done when: `pnpm storybook:build` xanh, axe a11y CI xanh.

- [x] **T4.6** — Run Phase 4 verify + size
  - Command: `pnpm verify && pnpm -C packages/themes size && pnpm -C packages/react size`
  - Done when: xanh; React adapter ≤ 4.5 KB target / 5.5 KB cap (thêm 2 primitive).

---

## 9. Phase 5 — `@f8/player-preset-web` v2 + opinionated `<F8WebPlayer>`/`<f8-web-player>`

**Mục tiêu phase:** Đưa plugin/primitive Phase 3+4 vào preset; ship 2 component one-liner cho ca dùng F8 chuẩn (classroom theme + VN labels + plugin tuple chuẩn + prefs + spinner + light overlay). Consumer dùng `<F8WebPlayer src="..." />` được; tự render bằng primitive `<Player.Root>...</Player.Root>` cũng được.

**Repo:** `f8-player`.
**Test gate:** `pnpm -C packages/preset-web verify && pnpm size`.
**Suggested model:** **Claude Sonnet 4.6 High** — composition + tree-shake verify; routine code nhưng nhiều file. Không cần Opus vì test gate đã chặt.

### Todos (Phase 5)

- [x] **T5.1** — Thêm `prefs` vào `F8WebPlayerPluginsOptions`
  - File(s): `packages/preset-web/src/createF8WebPlayerPlugins.ts`
  - Output: option `prefs?: false | PrefsPluginOptions` (default `{}` — bật với defaults). Append vào tuple ngay sau auth.
  - Done when: 3 case test (default on, opt-out via `prefs: false`, custom storageKey).

- [x] **T5.2** — Re-export `vietnameseLabels` từ `@f8/player-preset-web`
  - File(s): `packages/preset-web/src/index.ts`
  - Output: barrel re-export để consumer không phải import từ `@f8/player-react`/`@f8/player-lit` riêng.
  - Done when: import path mới hoạt động trong test consumer mock.

- [x] **T5.3** — `<F8WebPlayer>` (React one-liner)
  - File(s): `packages/preset-web/src/F8WebPlayer.tsx` (new — package phải accept react peer dep)
  - Output: bake `Root + Video + Captions + Spinner + Controls.Bar (classroom layout) + plugin tuple chuẩn + vietnameseLabels`. Props mirror React `<Player>` + thêm `theme?: 'classroom' | 'admin' | 'story' | 'minimal' | 'headless'`, `prefs?`, `onUnauthorized?`, `light?: boolean | string`, `poster?`. ≤ 200 LOC.
  - Done when: render test 5 case (classroom HLS, story full-bleed, admin markers, minimal hero, light poster); size delta ≤ 1.5 KB.

- [x] **T5.4** — `<f8-web-player>` (Lit one-liner)
  - File(s): `packages/preset-web/src/F8WebPlayer.ts` (Lit custom element)
  - Output: parity với React F8WebPlayer; reactive `src`, `poster`, `theme`, `light`, `playbackRate`, `volume`, `muted`. Re-emit DOM events. ≤ 250 LOC Lit.
  - Done when: 5 case test parity với React; size delta ≤ 2 KB.

- [x] **T5.5** — Size budget cho `@f8/player-preset-web`
  - File(s): `packages/preset-web/.size-limit.json`
  - Output: budget mới ≤ 6 KB target / 7 KB cap (preset gốc nhỏ vì tree-shake; F8WebPlayer thêm nhưng vẫn dưới cap khi dùng).
  - Done when: `pnpm -C packages/preset-web size` xanh ở 2 config (preset-only, preset+F8WebPlayer).

- [x] **T5.6** — Doc: bảng so sánh "primitive vs one-liner" trong README preset-web
  - File(s): `packages/preset-web/README.md` (new hoặc mở rộng)
  - Output: ≤ 100 LOC markdown — khi nào dùng one-liner, khi nào dùng primitive, recipe migration từ v1 plugin tuple sang v2 + prefs.
  - Done when: README tồn tại, lint OK.

- [x] **T5.7** — Run Phase 5 verify + size
  - Command: `pnpm verify && pnpm -C packages/preset-web size && pnpm -C packages/react size && pnpm -C packages/lit size`
  - Done when: xanh.

---

## 10. Phase 6 — Migrate `f8-ui` consumer

**Mục tiêu phase:** Replace `f8-ui/src/components/VideoPlayer/index.tsx` (687 LOC) bằng wrapper mỏng dùng `<F8WebPlayer>` + reactive props + callback props. **Hành vi không đổi**, characterization test cũ (21 case) phải pass 100%.

**Repo:** `f8-ui`.
**Test gate:** `pnpm test` (55 file, 235 test hiện tại).
**Suggested model:** **Claude Sonnet 4.6 High** — refactor file lớn nhưng đã có characterization test pin behavior; rủi ro vừa. Không cần Opus.

### Todos (Phase 6)

- [ ] **T6.1** — Confirm baseline test xanh trước refactor
  - Command: `pnpm -C ../f8-ui test` (chạy từ f8-player) hoặc `cd ~/Workspace/reactjs/f8-ui && pnpm test`
  - Done when: 235/235 pass.

- [ ] **T6.2** — Replace `VideoPlayer/index.tsx` bằng `<F8WebPlayer>` + thin adapter
  - File(s): `f8-ui/src/components/VideoPlayer/index.tsx`
  - Output: file giảm còn ≤ 200 LOC; giữ shape `VideoPlayerHandle` + `VideoPlayerProps` (compat 100%); ánh xạ:
    - `light` / `poster` → F8WebPlayer `light` / `poster` props
    - `tracks` → reactive `source.tracks`
    - `onStreamUnauthorized` → `onUnauthorized`
    - `blockSpaceToggle` → `keyboard: { blockKeys: ['Space'] }` qua F8WebPlayer prop pass-through
    - `onProgress` → `onTimeUpdate` shape adapter (giữ `{ playedSeconds, played, loaded, loadedSeconds }`)
  - Done when: file ≤ 200 LOC, 21 characterization test pass.

- [ ] **T6.3** — Xoá boilerplate đã được library hấp thụ
  - File(s): `f8-ui/src/components/VideoPlayer/index.tsx`
  - Output: xoá `PersistPrefs`, `EventBridge`, `HandleBridge`, `SourceSync`, `KeyboardHandler`, `LightOverlay`, `CenterPlaybackSpinner` (đã có trong library).
  - Done when: grep xác nhận 7 component này không còn; toàn bộ test pass.

- [ ] **T6.4** — Run full `f8-ui` test gate + manual smoke
  - Command: `cd ~/Workspace/reactjs/f8-ui && pnpm test && pnpm lint && pnpm typecheck && pnpm build`
  - Output: 235/235 test, 0 lint/type error, build artifact OK.
  - Done when: xanh.

- [ ] **T6.5** — Manual smoke 4 case ưu tiên (cần user)
  - Cases: G1 Course learning step (subtitles + autoplay), G2 Story full-bleed (blockSpaceToggle), G4 Course preview Safari escape, G5 blob preview.
  - Done when: user xác nhận pass; nếu fail, fix tại chỗ (≤ 2 vòng) hoặc rollback.

---

## 11. Phase 7 — Migrate `f8-dash-ui` consumer

**Mục tiêu phase:** Replace `VideoUploadPreview/index.jsx` (412 LOC) dùng `<F8WebPlayer>` với Tailwind admin theme. Adopt cookbook recipe từ Phase 4. Giảm xuống ≤ 180 LOC.

**Repo:** `f8-dash-ui`.
**Test gate:** `pnpm test` (11 characterization test hiện tại) + lint + build.
**Suggested model:** **GPT-5.5 Medium** — task mix JSX migration + Tailwind class trim; GPT-5.5 ergonomic ở UI/copy/CSS. Sonnet cũng OK.

### Todos (Phase 7)

- [ ] **T7.1** — Baseline test xanh
  - Done when: 11/11 characterization test pass trước khi sửa.

- [ ] **T7.2** — Replace `VideoUploadPreview/index.jsx` bằng `<F8WebPlayer theme="admin">` + Tailwind cookbook recipe
  - File(s): `f8-dash-ui/src/components/VideoUploadPreview/index.jsx`
  - Output: file ≤ 180 LOC; giữ:
    - `ref.seekTo(time | "HH:mm:ss")` adapter (vẫn cần `durationToSeconds` cho string input — F8 specific)
    - `onTimeupdate` → `onTimeUpdate` adapter
    - `transcripts` markers → `<F8WebPlayer markers={transcripts}>` (qua `usePluginCommand` internal)
  - Done when: 11 test pass, file ≤ 180 LOC.

- [ ] **T7.3** — Drop ~80 dòng Tailwind class string ad-hoc cho controls
  - File(s): `f8-dash-ui/src/components/VideoUploadPreview/index.jsx`, optional `player-badge-overrides.css`
  - Output: dùng `@f8/player-themes/admin.css` + thin override CSS module thay vì recompose từ `BTN_CLS` + `MENU_TRIGGER_CLS` + `MENU_OPTION_CLS` … (~6 const ~80 dòng). Giữ visual identical (snapshot Storybook).
  - Done when: visual snapshot diff ≤ 2 pixel-perfect tolerance; file giảm rõ rệt.

- [ ] **T7.4** — Run `f8-dash-ui` test + lint + typecheck + build
  - Done when: xanh.

- [ ] **T7.5** — Manual smoke 4 case
  - Cases: G7 Course video lesson editor (HLS + quality + markers), G8 Transcript markers click-to-seek, G10 MediaManager modal, G11 YouTube tech.
  - Done when: user xác nhận pass.

---

## 12. Phase 8 — Migrate `f8-pro-ui` consumer

**Mục tiêu phase:** Outer `<video-player>` dùng API mới (`<f8-web-player>` reactive `source` + callback props). Bỏ `_syncInnerSource` + `_activeSourceSrc` guard + `_runPlayerCommand` swallow. **Giữ nguyên 5 Reactive Controller F8-specific** (captions, chapters, context-menu, refresh-token, skip-segments) + question overlay logic.

**Repo:** `f8-pro-ui`.
**Test gate:** `npm run type-check && npm run test:lit && npm run test:unit`.
**Suggested model:** **Claude Opus 4.7 High** — outer `<video-player>` còn dính transcoding socket + refresh + question overlay + multi-state lifecycle; refactor có rủi ro cao. Opus High match SWE-bench multi-file refactor.

### Todos (Phase 8)

- [ ] **T8.1** — Baseline test xanh
  - Done when: 51/51 lit test + 56/56 unit test + type-check pass.

- [ ] **T8.2** — Replace inner `<f8-player>` bằng `<f8-web-player>` reactive `source`
  - File(s): `f8-pro-ui/src/components/video-player/index.ts`
  - Output: bỏ `_syncInnerSource`, `_activeSourceSrc`, `_runPlayerCommand` swallow. Property `source` đẩy thẳng vào inner. Bỏ `_loading` 800ms timer hack (không còn cần vì inner reactive).
  - Done when: file outer ≤ 500 LOC; 51 lit test pass.

- [ ] **T8.3** — Refactor 5 controller bằng `usePluginCommand`-style API (Lit reactive controller adopt new helper từ `@f8/player-lit`)
  - File(s): `f8-pro-ui/src/components/video-player/controllers/*.ts`
  - Output: nếu Phase 2 đã ship Lit helper tương đương `usePluginCommand`, controller dùng helper đó thay vì subscribe DOM event thủ công. Nếu chưa đủ thời gian, giữ controller như cũ — không bắt buộc.
  - Done when: 31 controller test pass.

- [ ] **T8.4** — Question overlay + `keyboard:disable/enable` chuyển sang `keyboard:setBlockKeys`
  - File(s): `f8-pro-ui/src/components/video-player/index.ts`
  - Output: dùng `setBlockKeys(ALL)` / `setBlockKeys([])` khi show/hide question overlay (forward-compat); legacy disable/enable vẫn hoạt động nhờ Phase 3 backward-compat.
  - Done when: existing question test pass.

- [ ] **T8.5** — Run gate
  - Command: `npm run type-check && npm run test:lit && npm run test:unit`
  - Done when: xanh.

- [ ] **T8.6** — Manual smoke 3 case
  - Cases: HLS upload video (captions auto, skip segment, 401 refresh, context menu, watermark), YouTube video, transcoding video.
  - Done when: user xác nhận pass.

---

## 13. Phase 9 — Performance audit + final cleanup + docs

**Mục tiêu phase:** Đo + chốt perf; lazy-load đường nhánh; cleanup examples folder; viết cookbook plugin authoring. Đảm bảo "phát triển thêm cực dễ".

**Repo:** `f8-player`.
**Test gate:** `pnpm verify && pnpm size && pnpm lighthouse` (Lighthouse CI có sẵn).
**Suggested model:** **GPT-5.5 High** — research/synthesis + perf bench + cookbook prose; GPT mạnh ở agentic search + benchmark synthesis.

### Todos (Phase 9)

- [ ] **T9.1** — Perf bench: 60fps timeupdate × 5 subscriber × 60s
  - File(s): `packages/core/perf/timeupdate.bench.ts` (new)
  - Output: bench Vitest/tinybench; threshold "no observable frame drop với 5 subscriber subscribe selector khác nhau". Baseline + sau Phase 1–8.
  - Done when: bench xanh; số liệu lưu vào `packages/core/perf/results.md`.

- [ ] **T9.2** — Lazy-load thumbnails plugin
  - File(s): `packages/preset-web/src/createF8WebPlayerPlugins.ts`
  - Output: chỉ thêm thumbnails khi `thumbnails === 'always'` AND consumer cấp `previewThumbnailsUrl` (sniff sau khi source set). Nếu không có URL, plugin lazy import — không vào bundle initial.
  - Done when: bundle delta đo được trước/sau; size check pass.

- [ ] **T9.3** — Audit subscriber leak + re-render trên consumer migrated
  - File(s): React DevTools profiler scenario; báo cáo trong `plans/f8-player-dx-flexibility-improvements.md` §13.
  - Output: số lần `usePlayerState` re-render trong 60s timeupdate ≤ 60 (1 re-render/timeupdate tick), không có subscriber leak sau unmount.
  - Done when: báo cáo tồn tại, không có leak.

- [ ] **T9.4** — Tạo `examples/` folder
  - File(s): `examples/01-classroom-oneliner/index.html` + `App.tsx`, `examples/02-headless-tailwind/`, `examples/03-custom-plugin-analytics/`
  - Output: 3 ví dụ chạy được, mỗi cái ≤ 100 LOC, `pnpm dev` từ root chạy được examples.
  - Done when: 3 ví dụ render thật trong Storybook hoặc Vite dev server.

- [ ] **T9.5** — Cookbook plugin authoring
  - File(s): `docs/spec/plugin-authoring.md` (new)
  - Output: ≤ 300 LOC markdown — lifecycle, commands, state subscribe, reactive data với `usePluginCommand`, SSR, test pattern. 1 walkthrough plugin demo (analytics sink).
  - Done when: doc compile được trong docs site.

- [ ] **T9.6** — Final size budget review
  - Files: tất cả `.size-limit.json`
  - Output: bảng before/after cho core, react, lit, themes, preset-web, mỗi plugin. Không vượt cap.
  - Done when: bảng trong §13; tất cả pass.

- [ ] **T9.7** — Update README + master plan
  - File(s): `README.md`, `plans/f8-player.md` master checklist
  - Output: README có section "DX cookbook" link; master plan `f8-player.md` thêm dấu chéo "DX improvements landed via plans/f8-player-dx-flexibility-improvements.md".
  - Done when: doc đồng bộ.

---

## 14. Master checklist (rolls up acceptance per user-visible goal)

### LOC reduction (đo bằng `wc -l`)

| File | Trước plan | Mục tiêu | Trạng thái |
|---|---|---|---|
| `f8-ui/src/components/VideoPlayer/index.tsx` | 687 | ≤ 200 | [ ] |
| `f8-dash-ui/src/components/VideoUploadPreview/index.jsx` | 412 | ≤ 180 | [ ] |
| `f8-pro-ui/src/components/video-player/index.ts` | 751 | ≤ 500 (giữ controllers) | [ ] |

### Behavior parity

- [ ] 16 golden case (G1–G16) pass identical sau migration — verify bằng tests + manual smoke.
- [ ] f8-ui 21 characterization test xanh.
- [ ] f8-dash-ui 11 characterization test xanh.
- [ ] f8-pro-ui 51 lit + 56 unit test xanh.
- [ ] `@f8/player-core` 313 unit test xanh.
- [ ] `@f8/player-react` test xanh, coverage ≥ 95%.
- [ ] `@f8/player-lit` test xanh.

### Size budget

- [ ] `@f8/player-core` ≤ 12 KB target / 15 KB cap (hiện 7.96 KB — giữ hoặc giảm).
- [ ] `@f8/player-react` ≤ 4.5 KB target / 5.5 KB cap (hiện 2.28 KB; thêm 2 primitive + callback hook).
- [ ] `@f8/player-lit` ≤ 4 KB target / 5 KB cap (hiện 1.13 KB; thêm reactive source).
- [ ] `@f8/player-plugin-prefs` ≤ 1.5 KB target / 2 KB cap (mới).
- [ ] `@f8/player-themes/headless.css` ≤ 1 KB (mới).
- [ ] `@f8/player-preset-web` ≤ 6 KB target / 7 KB cap.

### DX deliverables

- [ ] `<Root>` (React) chấp nhận 5 prop reactive (`source`, `poster`, `playbackRate`, `labels`, `volume`/`muted`).
- [ ] `<Root>` (React) chấp nhận 16 callback prop (`onPlay/onPause/...`).
- [ ] `<f8-player>` (Lit) chấp nhận reactive `source` property + same callback shape qua CustomEvent.
- [ ] `<Player.Spinner />` + `<Player.LightOverlay />` shipped + Storybook story.
- [ ] `@f8/player-plugin-prefs` shipped + doc.
- [ ] Keyboard plugin `blockKeys: Code[]` shipped (backward-compat với disable/enable).
- [ ] Auth-aware tự sinh `source.withCredentials` predicate.
- [ ] `headless.css` + Tailwind/shadcn cookbook + Storybook page.
- [ ] `<F8WebPlayer>` (React) + `<f8-web-player>` (Lit) one-liner shipped.
- [ ] `examples/` folder có 3 demo chạy được.
- [ ] `docs/spec/plugin-authoring.md` shipped.
- [ ] `docs/spec/styling-contract.md` shipped với bảng `data-*` đầy đủ.

### Performance

- [ ] Perf bench 60fps timeupdate × 5 subscriber không drop frame.
- [ ] Subscriber không leak sau unmount.
- [ ] Lazy-load thumbnails plugin verified.
- [ ] Lighthouse CI score không giảm so với baseline.

### UI/UX không regress

- [ ] 16 golden case smoke pass — user xác nhận bằng tay (Phase 6/7/8 manual smoke).
- [ ] Storybook a11y CI xanh trên mọi theme + headless.
- [ ] Visual snapshot Storybook diff ≤ tolerance cho 4 theme (classroom/admin/story/minimal).

---

## 15. Notes for resuming agents

- Mỗi phase = 1 session. Phase 1 chỉ pin behavior — không sửa source.
- Khi gặp vấn đề mới trong lúc code: blocker/root-cause cùng luồng → fix ngay; ngược lại → add todo vào đúng phase trong file này + sync `todo_write`. Không bỏ qua.
- 3 consumer là worktree riêng — không động `git restore`/`reset --hard` toàn cây.
- `f8-pro-ui` outer dùng `// @ts-nocheck` — không bật strict trong plan này (out of scope).
- Plan `f8-player.md` gốc vẫn là source of truth cho phase 0–9 cũ; plan này bổ sung layer DX, không thay thế.
- Khi `prefs` plugin bật trong preset, multi-player surface cần phân biệt `storageKey` — Phase 5 doc khuyến nghị format `f8-player:prefs:<surface>`.
