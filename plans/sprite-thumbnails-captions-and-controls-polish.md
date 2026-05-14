# Sprite thumbnails, Captions UI, Controls polish — Implementation plan

> Tracking file. Khi resume, mở file này → tìm phase đang dở → continue từ todo `[ ]` đầu tiên chưa check.

## 1. Mục tiêu

Bổ sung 3 mảng vào ecosystem `Reel`:

1. **Controls polish (cross repo)** — giảm padding hộp button + tăng size icon trong controls bar để cảm giác chặt + dễ đọc. Áp dụng cho `@f8team/reel-themes/classroom.css`, `f8-ui/VideoPlayer.module.scss`, `f8-dash-ui/VideoUploadPreview` (Tailwind). Padding bar (`1rem 2rem`) giữ nguyên — chỉ thu hộp button, kéo icon to.
2. **Sprite thumbnails preview** — thêm package `@f8team/reel-plugin-thumbnails` parse VTT sprite cues (`image#xywh=x,y,w,h`), expose API `getThumbnailAt(time)`. Nâng cấp `Controls.SeekBar` (React) + Lit default seek bar để render hover preview tooltip. Source descriptor mở rộng `thumbnails: { src, withCredentials? }`. Wire `f8-pro-ui` để truyền `video.sprite_url` (legacy field name).
3. **Captions UI** — thêm `Controls.Captions` (React) + nút Captions trong Lit default chrome: toggle off/on + dropdown chọn ngôn ngữ. Plugin `@f8team/reel-plugin-subtitles` đã có `subtitles:setLang` / `subtitles:off` commands; chỉ cần UI bind. Wire `f8-ui` (đã có `subtitle_languages[]`) + `f8-pro-ui` (đã có `subtitles_url` qua `captions-controller`).

## 2. Out of scope

- Quality persistence (vẫn deferred từ 9.F.4 plan).
- Chapter markers UI khác (vẫn dùng `@f8team/reel-plugin-markers` hiện tại).
- Video.js / videojs.thumbnails legacy port chi tiết — chỉ giữ tương thích VTT format chuẩn (cue body = `image.jpg#xywh=x,y,w,h`).
- F8 brand orange override / theming khác — chỉ neutral classroom theme.
- Đổi backend (`sprite_url`/`subtitles_url`/`subtitle_languages` đã sẵn từ BE).

## 3. Phân tích công việc

### 3.1 Cấu trúc hiện tại

- `f8-player` workspace: `packages/core` (PlayerOptions/SourceDescriptor), `packages/react` (Controls.\*), `packages/lit` (`<reel-player>` với default chrome khi `controls=true`), `packages/themes/classroom.css` (token `--reel-btn-size`, `--reel-icon-size`), 14 plugins độc lập.
- `f8-ui/src/components/VideoPlayer/index.tsx` + `VideoPlayer.module.scss` — wrapper React dùng `Controls.Bar` + `Controls.SeekBar` + `Controls.Quality` + `Controls.Settings` + `Controls.Fullscreen`. Subtitle: `tracks` prop → `SourceDescriptor.tracks` → `<Captions>` portal `<track>`.
- `f8-dash-ui/src/components/VideoUploadPreview/index.jsx` — wrapper React Tailwind, cùng Controls.\* + plugin markers/keyboard/hls-quality/auth-aware/fullscreen.
- `f8-pro-ui/src/components/video-player/index.ts` — outer Lit dùng `<f8-player .controls=true theme="classroom">`, inner chrome do `classroom.css` style (token `--reel-btn-size: 3.6rem`, `--reel-icon-size: 1.55rem`). Subtitle qua `captions-controller` (fetch blob + append `<track kind="captions" srclang="vi">`). Chưa có sprite thumbnails (deferred từ 9.F.4).
- `SourceDescriptor` hiện chỉ có `src/type/withCredentials/tracks`. Phải thêm field `thumbnails?` mà không phá tương thích.

### 3.2 Sprite thumbnails — VTT format

Format chuẩn (giống `videojs.thumbnails`, `plyr.io previewThumbnails`):

```
WEBVTT

00:00:00.000 --> 00:00:10.000
sprites/00001.jpg#xywh=0,0,160,90

00:00:10.000 --> 00:00:20.000
sprites/00001.jpg#xywh=160,0,160,90
```

- URL trong cue body có thể relative (resolve theo VTT URL) hoặc absolute.
- Plugin parse VTT thành array `{start, end, src, x, y, w, h}` rồi bisect theo `time` ⇒ `getThumbnailAt(time)`.
- Fetch VTT có thể cần auth cookies (f8-pro-ui qua api-gateway) ⇒ `withCredentials` option.

### 3.3 Controls.SeekBar enhancement

`@f8team/reel-react/Controls.SeekBar` hiện render `<div data-reel-seek-wrapper><div data-reel-seek-buffered/><input type=range data-reel-control=seek-bar/></div>`. Cần:

- Track pointer X position ⇒ tính `hoverTime`.
- Subscribe `usePlayerEvent('thumbnails:ready')` (plugin emit khi parse xong) hoặc đọc state từ plugin commands API.
- Render `<div data-reel-seek-thumbnail>` absolute, theme styles `background-image/position/size`.
- Lit default chrome (`F8Player.ts > renderDefaultControls`) có cùng pattern wrapper, append element thumbnail tương tự.

### 3.4 Controls.Captions component

- React: `<Controls.Captions>` render button SVG CC + native `<select>` overlay (giống Quality/Settings) options: `Off` + 1 option per lang. Subscribe state `subtitles:changed` từ plugin (đã có).
- Lit: thêm `renderCaptionsControl` trong `F8Player.renderDefaultControls`. SVG CC icon + select.
- Plugin commands: `subtitles:setLang(lang)` + `subtitles:off()` (đã có).
- Theme classroom.css thêm style cho `[data-reel-control="captions"]`.

### 3.5 Polish padding/icon size

Theme tokens hiện tại:

| Token                        | Hiện tại | Mục tiêu   | Note                                   |
| ---------------------------- | -------- | ---------- | -------------------------------------- |
| `--reel-btn-size`            | 3.6rem   | **3.2rem** | Nén bớt hộp button                     |
| `--reel-playpause-btn-size`  | 4rem     | **3.6rem** | Tỷ lệ giữ với btn-size                 |
| `--reel-icon-size`           | 1.55rem  | **1.8rem** | Icon to hơn, đỡ "lọt thỏm"             |
| `--reel-playpause-icon-size` | 2rem     | **2.2rem** | Cân với btn-size mới                   |
| `--reel-ctrl-height`         | 8.6rem   | giữ        | Bar height giữ — chỉ nội dung chặt hơn |

Mobile (`@media (pointer: coarse)`) giữ override 4.4rem / 4.9rem cho touch target ≥ 44px.

f8-ui SCSS module + f8-dash-ui Tailwind hardcode `3.6rem/1.55rem/4rem/2rem` ⇒ thay sang `3.2rem/1.8rem/3.6rem/2.2rem` cùng PR.

### 3.6 Risk + integration

- **Tests**: `core` 314 + `lit` 29 + `react` 74 + 14 plugins. Mỗi thay đổi `SourceDescriptor`/Controls.SeekBar/F8Player chrome đều có test cần update. Phải chạy `pnpm test` từng package.
- **f8-ui test 235/235** + **f8-dash-ui VideoUploadPreview 11/11** đang xanh — phải giữ.
- **Backward compat**: `SourceDescriptor.thumbnails` optional ⇒ plugin chỉ kích hoạt khi field có. Không phá source nào hiện tại.
- **CSS module/Tailwind sync**: f8-ui dùng SCSS hardcode `3.6rem`/`1.55rem`, f8-dash-ui dùng Tailwind arbitrary `size-[3.6rem]`/`size-[1.55rem]`. Phải đổi đồng bộ.
- **CC button visibility**: chỉ hiện khi state có ≥ 1 track (tránh nút trống lơ lửng). Plugin emit `subtitles:changed` rồi.

## 4. Phases (overview)

- **Phase 1 — Player core (logic-only / contract)**: mở rộng `SourceDescriptor`, viết `@f8team/reel-plugin-thumbnails`, polish theme classroom.css, thêm Controls.Captions (React), nâng cấp Controls.SeekBar render hover preview, thêm CC + thumbnails vào Lit default chrome. Toàn bộ trong `f8-player` repo, có unit tests.
- **Phase 2 — f8-ui wire**: cập nhật `VideoPlayer/index.tsx` truyền `thumbnails` (nếu BE có), thêm `Controls.Captions` vào Bar, đồng bộ SCSS module với token mới. Update `VideoPlayer.test.tsx`.
- **Phase 3 — f8-dash-ui wire**: cập nhật `VideoUploadPreview/index.jsx` thêm `Controls.Captions`, đồng bộ Tailwind class, polish. Update test 11/11.
- **Phase 4 — f8-pro-ui wire**: outer `<video-player>` truyền `source.thumbnails = { src: video.sprite_url, withCredentials: ... }`. CC button trong default chrome đã tự kích hoạt qua track render (no FE work in this repo cho captions UI vì dùng default chrome). Update characterization tests.

## 5. Phase 1 — Player core

**Mục tiêu phase:** ship `@f8team/reel-plugin-thumbnails` + Controls.Captions + Controls.SeekBar hover preview + theme polish, 100% unit tests xanh, không động consumer repo.

**Repo:** `f8-player` (monorepo).

**Input:**

- `packages/core/src/types/source.ts` — `SourceDescriptor` interface.
- `packages/react/src/components/controls/SeekBar.tsx` — wrapper render.
- `packages/react/src/components/controls/index.ts` — export list.
- `packages/lit/src/F8Player.ts` — `renderDefaultControls` + ICONS map.
- `packages/themes/src/classroom.css` — token + selectors.
- `packages/plugin-subtitles/src/subtitles.ts` — commands + events đã có.

**Output:**

- File mới: `packages/plugin-thumbnails/{package.json, src/index.ts, src/thumbnails.ts, src/parseSpriteVtt.ts, src/types.ts, src/__tests__/parseSpriteVtt.test.ts, src/__tests__/thumbnails.test.ts, tsup.config.ts, tsconfig.json, vitest.config.ts}`.
- File mới: `packages/react/src/components/controls/Captions.tsx`.
- File sửa: `packages/core/src/types/source.ts` (thêm `thumbnails?`), `packages/react/src/components/controls/SeekBar.tsx` (hover preview), `packages/react/src/components/controls/index.ts`, `packages/lit/src/F8Player.ts` (CC + thumbnails render + ICON cc), `packages/themes/src/classroom.css` (tokens + new selectors), `packages/lit/src/__tests__/F8Player.test.ts`, `packages/react/src/components/controls/__tests__/SeekBar.test.tsx`.

**Test gate:**

- `pnpm --filter @f8team/reel-plugin-thumbnails test` — green.
- `pnpm --filter @f8team/reel-react test` — green (74+ tests).
- `pnpm --filter @f8team/reel-lit test` — green (29+ tests).
- `pnpm --filter @f8team/reel-core test` — green (314 tests, không suy giảm).
- Build: `pnpm build` toàn workspace, không lỗi turbo.
- Bundle size: `pnpm size` — core <12KB / react <4KB / lit <4KB / new plugin <2KB.

**Suggested model:** Claude Opus 4.7 Medium — logic-heavy (VTT parser + state sync + multi-package contract) nhưng test gate rõ; không cần High vì có sandbox tests.

### Todos (Phase 1) — DONE 2026-05-13

- [x] **T1.1** — Mở rộng `SourceDescriptor.thumbnails`
  - File(s): `packages/core/src/types/source.ts`, `packages/core/src/types/options.ts` (re-export nếu cần).
  - Input: hiện chỉ có `src/type/withCredentials/tracks`.
  - Output: thêm `thumbnails?: { src: string; withCredentials?: boolean }`. Update JSDoc + golden case ref.
  - Done when: type exported, không phá test core hiện tại (`pnpm --filter @f8team/reel-core test`).

- [x] **T1.2** — Tạo skeleton package `@f8team/reel-plugin-thumbnails`
  - File(s): `packages/plugin-thumbnails/package.json`, `tsup.config.ts`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`, `src/types.ts`.
  - Input: pattern từ `packages/plugin-markers` hoặc `plugin-subtitles`.
  - Output: package buildable (empty plugin), version `0.0.0`, peerDeps `@f8team/reel-core`.
  - Done when: `pnpm install` resolve, `pnpm --filter @f8team/reel-plugin-thumbnails build` success.

- [x] **T1.3** — Implement VTT sprite parser
  - File(s): `packages/plugin-thumbnails/src/parseSpriteVtt.ts`.
  - Input: VTT text + base URL.
  - Output: function `parseSpriteVtt(text, baseUrl): ThumbnailCue[]` với `ThumbnailCue = { start, end, src, x, y, w, h }`. Hỗ trợ: cue body relative URL (resolve theo baseUrl), absolute URL, missing `#xywh=` (treat as full image).
  - Done when: unit test `parseSpriteVtt.test.ts` cover ≥ 5 case (1 cue, multi cue, relative path, absolute path, no xywh) — all pass.

- [x] **T1.4** — Implement plugin runtime
  - File(s): `packages/plugin-thumbnails/src/thumbnails.ts`, `src/index.ts`.
  - Input: `SourceDescriptor.thumbnails` từ player state.
  - Output: plugin fetch VTT (with credentials), parse, expose 2 cách:
    1. Command `thumbnails:getAt(time)` trả `ThumbnailCue | null`.
    2. Event `thumbnails:ready` emit `{ count }` khi parse xong; `thumbnails:cleared` khi reset.
  - Subscribe `state.source` change để re-fetch khi đổi source. Abort fetch khi dispose hoặc source đổi.
  - Done when: `thumbnails.test.ts` cover: ready emit, getAt edge (before first cue → cue 0; after last → null hoặc cue cuối tuỳ contract — chốt: trả cue gần nhất nếu trong dải, null nếu ngoài), source change reset, abort không leak.

- [x] **T1.5** — Update React Controls.SeekBar hover preview
  - File(s): `packages/react/src/components/controls/SeekBar.tsx`, `packages/react/src/hooks/usePlayer.ts` (đọc nếu cần).
  - Input: hiện wrapper render input + buffered overlay.
  - Output: thêm `<div data-reel-seek-thumbnail>` con, position `absolute`. Track `pointermove` trên wrapper ⇒ tính hover time (clamp `[0, duration]`). Gọi `player.commands.run("thumbnails:getAt", time)` để lấy cue. Khi cue có giá trị, set inline style `background-image/-position/-size` + `display: block`. Pointer leave/cancel → `display: none`. Tooltip cũng show formatted time text bên dưới.
  - Backwards compat: nếu plugin chưa load (command not registered), bắt lỗi, không render thumbnail. SSR safe: chỉ chạy effect khi `typeof window !== 'undefined'`.
  - Done when: `SeekBar.test.tsx` thêm test "renders thumbnail on hover when plugin available", existing tests vẫn xanh.

- [x] **T1.6** — Add React Controls.Captions
  - File(s): `packages/react/src/components/controls/Captions.tsx` (mới), `packages/react/src/components/controls/icons.tsx` (thêm `cc` icon), `packages/react/src/components/controls/index.ts` (export).
  - Input: state `source.tracks`, plugin commands `subtitles:setLang/off`, event `subtitles:changed` (đã có trong plugin-subtitles).
  - Output: component render button SVG CC + native `<select>` overlay (giống Settings/Quality). Options: `Tắt` + 1/lang theo `source.tracks`. Hide khi `tracks.length === 0`. Hiển thị data-attr `data-reel-control="captions"` để theme target. Active class khi có lang đang showing.
  - Done when: `Captions.test.tsx` cover: render khi có tracks, hide khi không, change → fire `subtitles:setLang`, "Tắt" → fire `subtitles:off`. React tests 74→ 75+ green.

- [x] **T1.7** — Add Lit default chrome: thumbnails + captions + cc icon
  - File(s): `packages/lit/src/F8Player.ts`.
  - Input: `renderDefaultControls`, `ICONS` map.
  - Output: thêm `renderCaptionsControl(state)` (chỉ render khi state.source.tracks?.length > 0), thêm `<div data-reel-seek-thumbnail>` vào timeline row giống React. Thêm `cc` icon path vào ICONS. Hover preview attach pointer listener trong `firstUpdated`.
  - Done when: `F8Player.test.ts` 29→32+ tests green, render captions khi có tracks, hide khi không, hover thumbnail khi có thumbnails.

- [x] **T1.8** — Polish theme classroom.css
  - File(s): `packages/themes/src/classroom.css`.
  - Input: tokens hiện tại `--reel-btn-size: 3.6rem`, `--reel-playpause-btn-size: 4rem`, `--reel-icon-size: 1.55rem`, `--reel-playpause-icon-size: 2rem`.
  - Output: đổi sang `--reel-btn-size: 3.2rem`, `--reel-playpause-btn-size: 3.6rem`, `--reel-icon-size: 1.8rem`, `--reel-playpause-icon-size: 2.2rem`. Thêm selector cho `[data-reel-control="captions"]` (button style giống mute/settings, order 14). Thêm style cho `[data-reel-seek-thumbnail]`: position absolute, bottom = wrapper height + 0.8rem, transform translateX(-50%), border-radius 0.4rem, box-shadow, transition opacity. Time text dưới thumbnail font 1.2rem.
  - Mobile override (`@media (pointer: coarse)`): btn-size lên 4rem, playpause 4.4rem (vẫn ≥ 44px touch). Icon size 2rem / 2.4rem.
  - Done when: visual smoke trong storybook (`pnpm --filter @f8team/reel-react storybook` nếu có), không vỡ layout. Lit/React tests vẫn xanh.

- [x] **T1.9** — Bundle + workspace audit
  - Command: `pnpm install`, `pnpm build`, `pnpm size`.
  - Done when: build success, mọi package nằm trong size budget. New plugin <2KB gzip.

- [x] **T1.10** — Run full test gate Phase 1
  - Command: `pnpm test` (toàn workspace).
  - Done when: 100% pass; không suy giảm số test cũ. Nếu fail, fix tới khi xanh trước khi đóng phase.

## 6. Phase 2 — f8-ui wire

**Mục tiêu phase:** wrapper `VideoPlayer` truyền `thumbnails` source field nếu BE có; thêm `Controls.Captions` vào bar; SCSS module đồng bộ token mới.

**Repo:** `f8-ui`.

**Input:**

- `src/components/VideoPlayer/index.tsx` (487 LOC).
- `src/components/VideoPlayer/VideoPlayer.module.scss` (475 LOC).
- `src/components/VideoPlayer/VideoPlayer.test.tsx`.
- `src/types/learning.ts` (`SubtitleLanguage`, `TrackStepStep`).

**Output:**

- `index.tsx`: prop mới `previewThumbnailsUrl?: string` (optional). Truyền `source.thumbnails = { src, withCredentials: false }`. Thêm `<Controls.Captions>` vào ActionsRow. Plugin `createThumbnailsPlugin` add vào list khi prop có.
- `VideoPlayer.module.scss`: `.btn` width/height 3.2rem (was 3.6rem); `[data-reel-icon]` 1.8rem (was 1.55rem); `.btnPlayPause` 3.6rem/2.2rem (was 4rem/2rem). Thêm `.captionsControl` style giống `.qualityControl`. Thêm `.thumbnail` cho `[data-reel-seek-thumbnail]`.
- Test: thêm coverage cho Captions render/hidden, ensure VideoPlayer pass `thumbnails` xuống.

**Test gate:**

- `pnpm test` (f8-ui) — 235/235 + new tests green.
- Manual smoke (user owed): course lesson video, story, video detail, preview course.

**Suggested model:** GPT-5.5 Medium — wrapper changes + SCSS polish + Tailwind-style class. UI/state polish đúng sweet spot GPT-5.5; logic minimal vì plugin đã viết Phase 1.

### Todos (Phase 2) — DONE 2026-05-13

- [x] **T2.1** — Add thumbnails package dependency to `f8-ui`
  - File(s): `package.json`, lockfile if package manager updates it.
  - Input: existing local `@f8team/reel-*` file dependencies.
  - Output: add `@f8team/reel-plugin-thumbnails` pointing to `../f8-player/packages/plugin-thumbnails`.
  - Done when: dependency is declared and install metadata is consistent.
- [x] **T2.2** — Wire `previewThumbnailsUrl` into `VideoPlayer`
  - File(s): `src/components/VideoPlayer/index.tsx`.
  - Input: current `VideoPlayerProps`, `plugins` list, `SourceDescriptor` construction.
  - Output: optional prop `previewThumbnailsUrl?: string`; source includes `thumbnails` only when provided; thumbnails plugin is added only when prop is present.
  - Done when: existing no-thumbnail behavior remains unchanged and thumbnail source/plugin are available when prop is set.
- [x] **T2.3** — Add captions control to the action row
  - File(s): `src/components/VideoPlayer/index.tsx`.
  - Input: `Controls.ActionsRow` order and `tracks`/subtitles plugin setup.
  - Output: render `<Controls.Captions>` near quality/settings and preserve hidden/no-op behavior when no subtitle tracks exist.
  - Done when: controls bar exposes captions UI without changing external embed behavior.
- [x] **T2.4** — Polish `VideoPlayer.module.scss` controls
  - File(s): `src/components/VideoPlayer/VideoPlayer.module.scss`.
  - Input: existing `.btn`, `.btnPlayPause`, `.qualityControl`, seek wrapper styles.
  - Output: button/icon sizes match Phase 1 tokens; captions control shares quality styling; thumbnail hover preview selector is styled.
  - Done when: desktop controls are tighter while coarse-pointer touch targets remain safe.
- [x] **T2.5** — Update `VideoPlayer.test.tsx` coverage
  - File(s): `src/components/VideoPlayer/VideoPlayer.test.tsx`.
  - Input: current mocks for `@f8team/reel-react`, subtitles/auth plugins.
  - Output: mock `Controls.Captions` and thumbnails plugin; assert captions render path and thumbnail option/plugin wiring.
  - Done when: focused VideoPlayer tests cover new wiring.
- [x] **T2.6** — Run Phase 2 verification
  - File(s): touched `f8-ui` files.
  - Input: project scripts in `package.json`.
  - Output: run focused tests first, then appropriate broader gate (`pnpm test` and/or typecheck/build if feasible); update this plan checklist.
  - Done when: tests/checks are green or any unrelated blocker is documented with evidence.

## 7. Phase 3 — f8-dash-ui wire

**Mục tiêu phase:** mirror các thay đổi Phase 2 vào VideoUploadPreview. Tailwind class đồng bộ token mới.

**Repo:** `f8-dash-ui`.

**Input:**

- `src/components/VideoUploadPreview/index.jsx` (223 LOC).
- `src/components/VideoUploadPreview/VideoUploadPreview.test.jsx` (11 tests).

**Output:**

- `index.jsx`: thêm prop `previewThumbnailsUrl?: string`, plugin thumbnails + `Controls.Captions` vào VisualLayer. Tailwind: `BTN_CLS` đổi `size-[3.2rem]` + `[&_svg]:size-[1.8rem]`; `PLAY_PAUSE_CLS` đổi `!size-[3.6rem]` + `[&_svg]:!size-[2.2rem]`. Thêm `CAPTIONS_CLS` (giống QUALITY_CLS).
- Test: 11→12+ tests, cover Captions render/hide.

**Test gate:**

- `pnpm test` (f8-dash-ui suite VideoUploadPreview) — green.
- Manual smoke (user owed): VideoUploadPreview thực tế với HLS auth source.

**Suggested model:** GPT-5.5 Medium — Tailwind/UI wiring routine.

### Todos (Phase 3) — DONE 2026-05-13

- [x] **T3.1** — Add subtitles/thumbnails package dependencies to `f8-dash-ui`
  - File(s): `package.json`, `pnpm-lock.yaml`.
  - Input: existing local `@f8team/reel-*` file dependencies.
  - Output: add `@f8team/reel-plugin-subtitles` and `@f8team/reel-plugin-thumbnails` file deps.
  - Done when: dependency declarations and lockfile entries are consistent.
- [x] **T3.2** — Wire `tracks` and `previewThumbnailsUrl` into `VideoUploadPreview`
  - File(s): `src/components/VideoUploadPreview/index.jsx`.
  - Input: current props, plugin list, `playerOptions.source`.
  - Output: optional `tracks` and `previewThumbnailsUrl` props; source passes `tracks` and conditional `thumbnails`; plugins include subtitles/thumbnails only when relevant.
  - Done when: no-track/no-thumbnail behavior stays identical; new props activate the player features.
- [x] **T3.3** — Add captions control to `VideoUploadPreview` actions row
  - File(s): `src/components/VideoUploadPreview/index.jsx`.
  - Input: existing `Controls.ActionsRow` order and Tailwind constants.
  - Output: `<Controls.Captions>` placed near Quality/Settings with a `CAPTIONS_CLS` matching compact button UX.
  - Done when: captions control can render and remains hidden/no-op when source has no tracks.
- [x] **T3.4** — Polish Tailwind control tokens
  - File(s): `src/components/VideoUploadPreview/index.jsx`.
  - Input: `BTN_CLS`, `PLAY_PAUSE_CLS`, `QUALITY_CLS`, seek bar classes.
  - Output: desktop size/icon tokens match Phase 1; coarse/mobile touch target remains ≥ 4.4rem; thumbnail hover preview has Tailwind styling.
  - Done when: classes use rem-based values and controls stay visually compact.
- [x] **T3.5** — Update `VideoUploadPreview.test.jsx` coverage
  - File(s): `src/components/VideoUploadPreview/VideoUploadPreview.test.jsx`.
  - Input: current Jest mocks for player/plugin packages.
  - Output: mock subtitles/thumbnails plugins and `Controls.Captions`; assert captions render and thumbnail source/plugin wiring.
  - Done when: focused tests cover new Phase 3 wiring.
- [x] **T3.6** — Run Phase 3 verification
  - File(s): touched `f8-dash-ui` files.
  - Input: project test script and focused component test.
  - Output: run focused VideoUploadPreview tests; run broader gate if feasible; update plan.
  - Done when: tests/checks are green or unrelated blockers are documented with evidence.

## 8. Phase 4 — f8-pro-ui wire

**Mục tiêu phase:** outer `<video-player>` truyền `source.thumbnails = { src: video.sprite_url, withCredentials }` (nếu có) qua `_buildSource` + `_buildPlayerOptions`. Thêm plugin thumbnails vào plugin list. Captions UI tự xuất hiện trong default chrome khi `<track>` được captions-controller append (không cần đổi gì FE-side cho CC). Cập nhật characterization tests.

**Repo:** `f8-pro-ui`.

**Input:**

- `src/components/video-player/index.ts` (729 LOC).
- `src/components/video-player/__tests__/video-player.lit.test.ts`.
- `src/components/video-player/controllers/types.ts` (thêm `sprite_url?: string` vào `VideoPlayerVideoMeta`).

**Output:**

- `index.ts`: import `createThumbnailsPlugin`. `_buildSource` thêm `thumbnails: v.sprite_url ? { src: v.sprite_url, withCredentials: ... } : undefined`. `_buildPlayerOptions.plugins` thêm thumbnails plugin.
- `controllers/types.ts`: `VideoPlayerVideoMeta` thêm `sprite_url?: string`.
- `__tests__/video-player.lit.test.ts`: thêm test "passes thumbnails to source when sprite_url present", "omits thumbnails when sprite_url null".

**Test gate:**

- `npm run test:lit` — 51→53+ green.
- `npm run test:unit` — 56/56 unchanged.
- `npm run type-check` — green.
- Manual smoke (user owed): lesson video với sprite_url + subtitles_url, hover seek preview, CC button toggle.

**Suggested model:** Claude Sonnet 4.6 Medium — Lit element wiring + type extension, scope nhỏ, không cần Opus.

### Todos (Phase 4) — DONE 2026-05-13

- [x] **T4.1** — Fix `vitest.lit.config.ts`: jsdom 27 ESM incompatibility → switch to `happy-dom`
  - File(s): `vitest.lit.config.ts`, `package.json`.
  - Input: `environment: "jsdom"` — jsdom 27 pulls in `@asamuzakjp/css-color` (CJS) which tries to `require()` `@csstools/css-calc` (ESM-only), causing all 6 lit test files to fail to collect.
  - Output: `environment: "happy-dom"`, `happy-dom` added as devDep. Pre-existing 52 lit tests turn green.
  - Done when: `npm run test:lit` — 52/52 pass.

- [x] **T4.2** — Add `@f8team/reel-plugin-thumbnails` dependency
  - File(s): `package.json`.
  - Input: existing local `@f8team/reel-*` file deps.
  - Output: `"@f8team/reel-plugin-thumbnails": "file:../../reactjs/f8-player/packages/plugin-thumbnails"` added; `npm install` resolves.
  - Done when: `node_modules/@f8team/reel-plugin-thumbnails` present.

- [x] **T4.3** — Extend `VideoPlayerVideoMeta` with `sprite_url`
  - File(s): `src/components/video-player/controllers/types.ts`.
  - Input: interface missing `sprite_url`.
  - Output: `sprite_url?: string` added with JSDoc.
  - Done when: `npm run type-check` — green.

- [x] **T4.4** — Wire `createThumbnailsPlugin` in `_buildSource` and `_buildPlayerOptions`
  - File(s): `src/components/video-player/index.ts`.
  - Input: `_buildSource` returns no `thumbnails`; `_buildPlayerOptions.plugins` has no thumbnails entry.
  - Output: `import { createThumbnailsPlugin }` added. `_buildSource`: extracts `withCredentials` predicate, evaluates it against `sprite_url` to produce **boolean** `thumbsWithCreds` (matches `ThumbnailsDescriptor.withCredentials: boolean` contract — avoids truthy-function bug that would always send credentials for CDN sprites). `_buildPlayerOptions`: plugin pushed **unconditionally** so late source-switch via `_syncInnerSource()` to a video with `sprite_url` activates the hover preview (plugins freeze at connect time).
  - Done when: new tests pass; existing tests unaffected.

- [x] **T4.5** — Add `createThumbnailsPlugin` to `f8-player-plugin` stub
  - File(s): `src/components/video-player/__tests__/stubs/f8-player-plugin.ts`.
  - Input: stub missing `createThumbnailsPlugin` export.
  - Output: `export const createThumbnailsPlugin = factory("thumbnails")` added.
  - Done when: tests that reference thumbnails plugin name resolve correctly.

- [x] **T4.6** — Write 4 new characterization tests: thumbnails wiring
  - File(s): `src/components/video-player/__tests__/video-player.lit.test.ts`.
  - Input: no thumbnails coverage.
  - Output: `makeReadyUploadVideoWithSprite()` helper + 4 tests: (a) source.thumbnails populated when sprite_url present with boolean `withCredentials: false` (CDN case), (b) source.thumbnails absent when sprite_url missing, (c) plugin always installed regardless of sprite_url so late source switches work, (d) `withCredentials: true` when sprite_url starts with api-gateway baseUrl.
  - Done when: `npm run test:lit` — 56/56 (52 + 4 new) pass.

- [x] **T4.7** — Run full Phase 4 test gate + type-check
  - Commands: `npm run test:lit` (56/56), `npm run test:unit` (46/46, 2 pre-existing unhandled errors from jsdom in unit env — not from Phase 4 changes), `npm run type-check` (clean).
  - Done when: all gates green.

## 9. Master checklist (rollup)

Tóm tắt acceptance theo góc nhìn user/contract — không trùng todo từng phase, mà là tiêu chí "feature đã sống được":

- [ ] `SourceDescriptor.thumbnails` shipped trong `@f8team/reel-core`, JSDoc + types đồng bộ.
- [ ] Package mới `@f8team/reel-plugin-thumbnails` published trong workspace, build + size budget pass.
- [ ] VTT sprite parser unit tests cover relative/absolute/no-xywh — 100%.
- [ ] `Controls.SeekBar` (React) render thumbnail tooltip on hover khi plugin available; SSR safe; không phá test 74 hiện tại.
- [ ] `Controls.Captions` (React) render khi `source.tracks.length > 0`, fire `subtitles:setLang`/`subtitles:off`, hide khi không có track.
- [ ] Lit `<reel-player>` default chrome có CC button + thumbnail hover; tests xanh.
- [ ] Theme `classroom` button size 3.2rem / icon 1.8rem (mobile override 4rem ≥ 44px touch).
- [x] `f8-ui` SCSS module đồng bộ size mới, có Captions, có thumbnail. 235+/235+ tests xanh.
- [x] `f8-dash-ui` Tailwind đồng bộ size mới, có Captions, có thumbnail. 11+/11+ tests xanh.
- [x] `f8-pro-ui` outer truyền `sprite_url` xuống source, default chrome auto-render thumbnail + CC. 56/56 lit + 46/46 unit xanh.
- [ ] Mobile pointer:coarse vẫn giữ touch target ≥ 44px (4.4rem) — verified mỗi repo.
- [ ] Manual smoke (user owed): lesson video f8-pro-ui hover sprite preview + CC toggle; story f8-ui CC; admin f8-dash-ui Captions không lỗi.
