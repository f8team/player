# @f8team/reel-lit

Lit adapter for [`@f8team/reel-core`](../core). Ships `<reel-player>` — a tiny
custom element wrapping the headless player engine — and a `PlayerController`
Reactive Controller for advanced composition.

Bundle size: target **≤ 4 KB gzip** (adapter only; `lit` + `@f8team/reel-core`
are peer dependencies and not counted).

## Install

```bash
pnpm add @f8team/reel-lit @f8team/reel-core lit
```

## Quick start

```ts
import { defineReelPlayer } from "@f8team/reel-lit";

defineReelPlayer(); // register <reel-player>
```

```html
<reel-player .options=${{ source: { src: "https://cdn.example.com/video.m3u8" } }}>
  <!-- Optional consumer-supplied chrome (your overlays, your controls) -->
  <my-controls slot="controls"></my-controls>
</reel-player>

<script>
  const el = document.querySelector("reel-player");
  el.addEventListener("reel-player:timeupdate", (e) => console.log(e.detail));
  el.play();
  el.seekTo(42);
</script>
```

## API

### `<reel-player>` element

| Member            | Type                  | Notes                                                       |
| ----------------- | --------------------- | ----------------------------------------------------------- |
| `options`         | `PlayerOptions`       | Read once on first connect. Use `raw.setSource(...)` later. |
| `videoClass`      | `string`              | Forwarded to the inner `<video>`.                           |
| `play()`          | `() => Promise<void>` | Shape-compat with React adapter `PlayerHandle`.             |
| `pause()`         | `() => void`          | Captures `currentTime` for `restore()`.                     |
| `paused()`        | `() => boolean`       |                                                             |
| `seekTo(seconds)` | `(s: number) => void` | Clamped to `[0, duration]`.                                 |
| `restore()`       | `() => Promise<void>` | Seek to last paused time then play.                         |
| `raw`             | `Player \| null`      | Underlying core player.                                     |

### Events

Every core event is re-emitted as `CustomEvent("reel-player:<name>")` with
`detail` set to the core payload. Bubbles + composed so it works through
slots.

Supported names: `ready`, `play`, `pause`, `ended`, `timeupdate`,
`durationchange`, `ratechange`, `volumechange`, `seeking`, `seeked`,
`buffering`, `qualitychange`, `error`, `unauthorized`, `fullscreenchange`,
`pipchange`.

### `PlayerController`

Use when you want to build your own custom element that wraps the engine.
See the TSDoc on the class for the full surface.
