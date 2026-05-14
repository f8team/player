# Reel — `data-*` attribute styling contract

> **Status:** Baseline audit for Phase 1 (DX plan T1.7). Phase 4 will add a headless
> `@f8team/reel-themes/headless.css` that imports this contract into stylesheet layout rules.

## Attribute stability legend

| Symbol          | Meaning                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------- |
| ✅ **stable**   | Semver-protected. Consumers may use in production CSS/selectors. Removal = major version. |
| 🔶 **internal** | Subject to change without notice. Tests / theming internals only.                         |

---

## 1. Host & video element

| Attribute             | Element               | Values                | Stability | Semantic                                                      |
| --------------------- | --------------------- | --------------------- | --------- | ------------------------------------------------------------- |
| `data-reel`           | root wrapper `<div>`  | `""` (present/absent) | ✅        | Outermost player container. Attach theme resets here.         |
| `data-reel-video`     | `<video>`             | `""`                  | ✅        | The native video element. Use `[data-reel-video]` to size it. |
| `data-reel-yt-hidden` | `<div>` (React theme) | `""`                  | 🔶        | YouTube source: hides native controls; internal.              |

---

## 2. Controls layout

| Attribute                   | Element                    | Values                                                                                                               | Stability | Semantic                                                                       |
| --------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------ |
| `data-reel-controls`        | controls root `<div>`      | `""`                                                                                                                 | ✅        | Top-level controls bar. Toggled present/absent; use for show/hide.             |
| `data-reel-controls-layout` | controls root              | `"two-row"` \| `"single-row"`                                                                                        | ✅        | Layout variant; drives row stacking.                                           |
| `data-reel-controls-row`    | `<div>`                    | `"timeline"` \| `"actions"`                                                                                          | ✅        | Identifies the row within the two-row layout.                                  |
| `data-reel-control`         | individual control buttons | `"play-pause"` \| `"seek-bar"` \| `"time"` \| `"volume"` \| `"mute"` \| `"fullscreen"` \| `"pip"` \| `"seek-offset"` | ✅        | Names each clickable/interactive control. Target individual controls from CSS. |

---

## 3. Center overlays

| Attribute                  | Element                   | Values | Stability | Semantic                                                                                   |
| -------------------------- | ------------------------- | ------ | --------- | ------------------------------------------------------------------------------------------ |
| `data-reel-center-tap`     | center click target       | `""`   | ✅        | Invisible full-area click zone for double-tap seek / single-tap play-pause.                |
| `data-reel-big-play`       | large play button overlay | `""`   | ✅        | The "big play" button shown before first play (not the light mode overlay).                |
| `data-reel-center-spinner` | center spinner (Lit only) | `""`   | ✅        | Buffering / quality-switch center spinner. React uses component state; Lit uses attribute. |

---

## 4. Seek / timeline

| Attribute                        | Element                      | Values | Stability | Semantic                                                               |
| -------------------------------- | ---------------------------- | ------ | --------- | ---------------------------------------------------------------------- |
| `data-reel-seek-wrapper`         | seek bar outer `<div>`       | `""`   | ✅        | Wraps the range input + overlays. Use for hover thumbnail positioning. |
| `data-reel-seek-buffered`        | buffered progress bar        | `""`   | ✅        | Inline-width filled from 0–100% matching buffered range.               |
| `data-reel-seek-thumbnail`       | thumbnail hover preview      | `""`   | 🔶        | Container for sprite thumbnail on hover. May change shape.             |
| `data-reel-seek-thumbnail-image` | thumbnail image `<div>`      | `""`   | 🔶        | Background-image sprite positioned by plugin.                          |
| `data-reel-seek-thumbnail-time`  | timestamp label in thumbnail | `""`   | 🔶        | Time label rendered in the thumbnail bubble.                           |

---

## 5. Control menus (popovers)

| Attribute                   | Element                   | Values                                   | Stability | Semantic                                                                          |
| --------------------------- | ------------------------- | ---------------------------------------- | --------- | --------------------------------------------------------------------------------- |
| `data-reel-control-trigger` | popover trigger button    | `""`                                     | ✅        | Button that opens a settings/captions/quality menu.                               |
| `data-reel-trigger-label`   | text label in trigger     | `""`                                     | ✅        | E.g. current quality "720p" displayed on the trigger button.                      |
| `data-reel-control-popover` | popover container `<div>` | `""`                                     | ✅        | The floating list container for a control menu.                                   |
| `data-reel-control-menu`    | listbox `<ul>`            | `"captions"` \| `"quality"` \| `"speed"` | ✅        | Identifies which menu the listbox belongs to.                                     |
| `data-reel-menu-open`       | control parent            | `""` (present = open)                    | ✅        | Applied to the trigger/wrapper when the menu is open. Drive open animations here. |
| `data-reel-control-option`  | `<li>` in listbox         | `""`                                     | ✅        | One option row in a control menu.                                                 |
| `data-reel-option-label`    | text span in option       | `""`                                     | ✅        | The human-readable label (e.g. "720p", "1×").                                     |
| `data-reel-option-badge`    | badge span in option      | `""`                                     | 🔶        | Optional secondary badge (e.g. "HD").                                             |
| `data-reel-option-check`    | checkmark in option       | `""`                                     | ✅        | Shown on the active/selected option.                                              |

---

## 6. Quality & captions state

| Attribute                   | Element                | Values             | Stability | Semantic                                                                         |
| --------------------------- | ---------------------- | ------------------ | --------- | -------------------------------------------------------------------------------- |
| `data-reel-quality-text`    | quality label `<span>` | `""`               | ✅        | "720p", "Auto", etc. Rendered in toolbar.                                        |
| `data-reel-quality-value`   | resolution `<span>`    | `""`               | 🔶        | Raw numeric height value (e.g. `720`).                                           |
| `data-reel-quality-badge`   | badge overlay          | `""`               | 🔶        | "HD" / "4K" badge overlaid on quality button.                                    |
| `data-reel-captions-active` | captions button        | boolean expression | ✅        | Present + non-empty when captions are showing; drives the "active" visual state. |

---

## 7. Icon primitive

| Attribute        | Element                 | Values                                                                                                                                                                   | Stability | Semantic                                                                |
| ---------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ----------------------------------------------------------------------- |
| `data-reel-icon` | `<svg>` or icon wrapper | `"play"` \| `"pause"` \| `"volume"` \| `"volumeMuted"` \| `"maximize"` \| `"minimize"` \| `"settings"` \| `"pip"` \| `"cc"` \| `"rewind"` \| `"forward"` \| `"compress"` | ✅        | Names the icon. Use `[data-reel-icon="play"]` to target specific icons. |

---

## 8. Phase 4 additions (planned)

The following attributes will be introduced in Phase 4 (T4.1) for the new
`<Player.Spinner />` and `<Player.LightOverlay />` React primitives:

| Attribute                  | Planned element | Planned values |
| -------------------------- | --------------- | -------------- |
| `data-reel-center-spinner` | spinner `<div>` | `""`           |
| `data-reel-light-overlay`  | overlay `<div>` | `""`           |
| `data-reel-light-poster`   | poster `<img>`  | `""`           |

---

## 9. Lit `<reel-player>` CustomEvent contract (Phase 2 T2.6)

Every `PlayerEvents[K]` core event is re-emitted on `<reel-player>` as
`new CustomEvent("reel-player:<name>", { detail, bubbles: true, composed: true })`.
Listen via DOM (`el.addEventListener("reel-player:play", e => …)`).

`detail` shape matches the corresponding React `<Root>` callback prop argument
exactly (Phase 2 ergonomic-surface contract). Both adapters share the same
`PlayerEvents` source-of-truth so consumer migration is mechanical.

| Custom event name              | `detail` shape                                     | React callback equivalent                            |
| ------------------------------ | -------------------------------------------------- | ---------------------------------------------------- |
| `reel-player:ready`            | `{ duration: number }`                             | `onReady` (also fires `onDuration`)                  |
| `reel-player:play`             | `void`                                             | `onPlay` (also `onStart` once per mount)             |
| `reel-player:pause`            | `void`                                             | `onPause`                                            |
| `reel-player:ended`            | `void`                                             | `onEnded`                                            |
| `reel-player:timeupdate`       | `{ currentTime, playedSeconds, duration }`         | `onTimeUpdate` (and `onProgress` with derived shape) |
| `reel-player:durationchange`   | `{ duration: number }`                             | `onDuration`                                         |
| `reel-player:ratechange`       | `{ playbackRate: number }`                         | `onRateChange(playbackRate)`                         |
| `reel-player:volumechange`     | `{ volume: number, muted: boolean }`               | `onVolumeChange`                                     |
| `reel-player:seeking`          | `{ time: number }`                                 | — (use `seeked` for after-the-fact)                  |
| `reel-player:seeked`           | `{ time: number }`                                 | `onSeek(time)` and `onSeeked(time)`                  |
| `reel-player:buffering`        | `{ isBuffering: boolean }`                         | `onBuffering(isBuffering)`                           |
| `reel-player:qualitychange`    | `{ quality: QualityLevel \| null, auto: boolean }` | `onQualityChange`                                    |
| `reel-player:qualityswitch`    | `{ active: boolean }`                              | `onQualitySwitch(active)`                            |
| `reel-player:error`            | `PlayerError`                                      | `onError`                                            |
| `reel-player:unauthorized`     | `UnauthorizedEvent`                                | `onUnauthorized`                                     |
| `reel-player:fullscreenchange` | `{ fullscreen: boolean }`                          | — (read from state store)                            |
| `reel-player:pipchange`        | `{ pip: boolean }`                                 | — (read from state store)                            |

**Signature differences vs React callbacks:** the React adapter unwraps single-key
payloads for ergonomic reasons (`onSeek(seconds)`, `onRateChange(rate)`,
`onBuffering(active)`). The Lit `detail` keeps the original object shape from
`PlayerEvents` so it's directly typed against `@f8team/reel-core` exports.

## 10. Headless theme + Tailwind / shadcn cookbook (Phase 4 T4.4)

### Quick start — Tailwind classroom override

```tsx
import "@f8team/reel-themes/headless.css";
import { Player } from "@f8team/reel-react";

<Player.Root options={{ source: { src: "..." } }}>
  <Player.Video className="aspect-video w-full" />
  <Player.Spinner className="bg-black/40 rounded-full p-2 text-white" />

  <Player.Controls.Bar
    className="[&[data-reel-controls]]:bg-gradient-to-t [&[data-reel-controls]]:from-black/80 [&[data-reel-controls]]:to-transparent [&[data-reel-controls]]:px-3 [&[data-reel-controls]]:py-2 text-white"
    layout="two-row"
  >
    <Player.Controls.TimelineRow className="gap-3">
      <Player.Controls.Time variant="current" className="text-xs tabular-nums" />
      <Player.Controls.SeekBar className="[&_[data-reel-seek-wrapper]]:h-1.5 [&_[data-reel-seek-buffered]]:bg-white/40" />
      <Player.Controls.Time variant="duration" className="text-xs tabular-nums" />
    </Player.Controls.TimelineRow>
    <Player.Controls.ActionsRow className="gap-1">
      <Player.Controls.PlayPause className="size-9 hover:bg-white/10 rounded" />
      <Player.Controls.Mute className="size-9 hover:bg-white/10 rounded" />
      <Player.Controls.Volume className="w-20" />
      <Player.Controls.Quality className="hover:bg-white/10 rounded px-2" />
      <Player.Controls.Settings className="size-9 hover:bg-white/10 rounded" />
      <Player.Controls.Pip className="size-9 hover:bg-white/10 rounded ml-auto" />
      <Player.Controls.Fullscreen className="size-9 hover:bg-white/10 rounded" />
    </Player.Controls.ActionsRow>
  </Player.Controls.Bar>
</Player.Root>;
```

### Recipe — admin / Tailwind compact dark

Match `f8-dash-ui` admin density without writing 80 lines of utility strings:

```tsx
const btn =
  "size-8 rounded hover:bg-white/10 transition focus-visible:ring-2 focus-visible:ring-white/40";

<Player.Controls.Bar
  className="[&[data-reel-controls]]:bg-neutral-900/80 [&[data-reel-controls]]:backdrop-blur [&[data-reel-controls]]:px-2 [&[data-reel-controls]]:py-1.5 text-neutral-100 text-xs"
  layout="single-row"
>
  <Player.Controls.PlayPause className={btn} />
  <Player.Controls.Time variant="current" />
  <Player.Controls.SeekBar className="mx-2 flex-1" />
  <Player.Controls.Time variant="duration" className="text-neutral-400" />
  <Player.Controls.Quality className="px-2 hover:bg-white/10 rounded" />
  <Player.Controls.Settings className={btn} />
  <Player.Controls.Fullscreen className={btn} />
</Player.Controls.Bar>;
```

### Recipe — shadcn-style menu (captions / quality / speed)

`shadcn/ui` uses Radix popovers internally; the `<reel-player>` control menus already
emit the right attributes for nesting popovers visually:

```css
/* Theme override in your CSS layer */
[data-reel-control-popover] {
  @apply bg-popover text-popover-foreground border border-border rounded-md shadow-md p-1 min-w-[12rem];
}
[data-reel-control-option] {
  @apply flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer;
}
[data-reel-control-option]:hover {
  @apply bg-accent text-accent-foreground;
}
[data-reel-option-check] {
  @apply text-primary;
}
[data-reel-menu-open] {
  @apply ring-1 ring-primary/30;
}
```

### When to pick which theme

| Goal                                  | Import                              |
| ------------------------------------- | ----------------------------------- |
| F8 brand defaults (classroom lessons) | `@f8team/reel-themes/classroom.css` |
| Admin dense controls (dashboard)      | `@f8team/reel-themes/admin.css`     |
| Full-bleed story (Reels-style)        | `@f8team/reel-themes/story.css`     |
| Marketing hero / landing autoplay     | `@f8team/reel-themes/minimal.css`   |
| Bring your own design system          | `@f8team/reel-themes/headless.css`  |

`headless.css` ships only layout/z-index/positioning. Everything else (colors, sizes,
shadows, focus rings, hover states) is the consumer's responsibility — typically a
small Tailwind utility chain or shadcn token override per the recipes above.

## Usage notes

- **CSS selectors** should target `[data-reel-…]` / `[data-reel-…]` — never internal class names (those are implementation details).
- **Theme override**: import `@f8team/reel-themes/headless.css` to get layout+z-index with zero visual opinions, then layer your own colors/shapes on top.
- **Tailwind consumers**: use arbitrary variant `[&[data-reel-controls]]:…` or `[data-reel-seek-wrapper]:…` class syntax — recipes above.
