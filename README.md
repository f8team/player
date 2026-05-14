<div align="center">

# Reel

**A headless, framework-agnostic, plugin-driven video player engine.**

Built for production. Designed to scale. Sold to be reliable.

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Bundle: <15KB gzip](https://img.shields.io/badge/core-%3C15KB%20gzip-brightgreen.svg)](./packages/core)
[![A11y: WCAG AA](https://img.shields.io/badge/a11y-WCAG%20AA-blue.svg)](./docs/spec/a11y.md)

</div>

---

## Why another player?

We rebuilt the video stack that powers F8 (learning courses, social stories, admin
upload editors) because the existing tools forced us to choose between three bad
options: ship a 150KB+ `video.js` with seven plugins, fight `react-player`'s
opinionated DOM, or write yet another bespoke `<video>` wrapper for every surface.

Reel is the result: a small, headless engine you can compose into any UI,
extend through tree-shakeable plugins, theme through CSS variables, and swap into
any framework via thin adapters.

## Highlights

- **Headless engine** — the core is `HTMLMediaElement`-only and ships <15KB gzip.
- **Framework adapters** — first-class React (`@f8team/reel-react`); Lit, Vue, and vanilla on the roadmap.
- **Composable Slot API** — Radix-style primitives. Build your own skin without forking.
- **Plugin system** — subtitles, HLS quality, markers, keyboard, touch gestures, resume position, analytics, PIP, watermark, auth-aware 401/403, story gestures.
- **Theme tokens** — CSS variables only. No CSS-in-JS, no Tailwind dependency. Override anything.
- **A11y-first** — ARIA roles, focus traps, screen reader announcements, full keyboard navigation, captions menu.
- **Resilient** — typed event bus, network retry with backoff, segment-level auth callbacks, source failover.
- **Real surfaces** — drives F8 course learning, social stories, admin video editors with chapters, and public video pages.

## Status

Phase 0 (spec freeze) — see [`plans/f8-player.md`](./plans/f8-player.md) for the
phased roadmap and [`docs/spec/`](./docs/spec/) for the locked contracts.

## Architecture (one-screen view)

```text
@f8team/reel-core (headless, framework-agnostic, ~15KB gzip)
  ├── state machine (idle → loading → ready → playing → paused → ended → error)
  ├── reactive store (selectors + subscribers)
  ├── source registry (Native, HLS lazy, YouTube lazy, DASH future)
  ├── plugin bus (setup/teardown, contributes API)
  ├── typed event bus
  ├── a11y model
  └── theme tokens

@f8team/reel-react ── thin React adapter (hooks + Slot API + ref back-compat)
@f8team/reel-themes ── classroom · story · admin · minimal
@f8team/reel-plugin-* ── subtitles · hls-quality · markers · keyboard · touch-gestures
                     · resume-position · auth-aware · pip · watermark · story-gestures
```

Full diagram: [`docs/spec/architecture.md`](./docs/spec/architecture.md).

## Packages

| Package                                   | Purpose                   | Status  |
| ----------------------------------------- | ------------------------- | ------- |
| `@f8team/reel-core`                       | Headless engine           | Phase 1 |
| `@f8team/reel-react`                      | React adapter             | Phase 2 |
| `@f8team/reel-themes`                     | Built-in themes           | Phase 3 |
| `@f8team/reel-plugin-subtitles`           | VTT multi-language        | Phase 3 |
| `@f8team/reel-plugin-hls-quality`         | Quality selector          | Phase 3 |
| `@f8team/reel-plugin-markers`             | Chapters / transcripts    | Phase 3 |
| `@f8team/reel-plugin-keyboard`            | Hotkeys                   | Phase 3 |
| `@f8team/reel-plugin-touch-gestures`      | Tap, hold, double-tap     | Phase 3 |
| `@f8team/reel-plugin-resume-position`     | Resume from last play     | Phase 3 |
| `@f8team/reel-plugin-auth-aware`          | 401/403 cookie + callback | Phase 3 |
| `@f8team/reel-plugin-story-gestures`      | Instagram-style stories   | Phase 3 |
| `@f8team/reel-plugin-safari-mp4-fallback` | Safari escape hatch       | Phase 3 |
| `@f8team/reel-plugin-analytics`           | Progress / view events    | Phase 3 |
| `@f8team/reel-plugin-pip`                 | Picture-in-Picture        | Phase 3 |
| `@f8team/reel-plugin-watermark`           | Premium watermark         | Phase 3 |
| `@f8team/reel-lit`                        | Lit adapter (deferred)    | Phase 9 |

## Quickstart (preview, not yet published)

```tsx
// One-liner
import { Player } from "@f8team/reel-react";
import "@f8team/reel-themes/classroom.css";

<Player src="https://cdn.example.com/lesson.m3u8" theme="classroom" />;
```

```tsx
// Composable
import { Player } from "@f8team/reel-react";
import { markers } from "@f8team/reel-plugin-markers";

<Player.Root source={{ src }} plugins={[markers({ data: chapters })]}>
  <Player.Video />
  <Player.Captions />
  <Player.Controls.Bar>
    <Player.Controls.PlayPause />
    <Player.Controls.SeekBar />
    <Player.Controls.Time />
    <Player.Controls.Volume />
    <Player.Controls.Quality />
    <Player.Controls.PlaybackRate />
    <Player.Controls.Captions />
    <Player.Controls.Pip />
    <Player.Controls.Fullscreen />
  </Player.Controls.Bar>
</Player.Root>;
```

## DX cookbook

- [`docs/spec/plugin-authoring.md`](./docs/spec/plugin-authoring.md) — plugin lifecycle, commands, state subscriptions, SSR guards, tests, and lazy-loading patterns.
- [`packages/preset-web/README.md`](./packages/preset-web/README.md) — when to use primitives vs `<ReelWebPlayer>` / `<reel-web-player>`, plus preset options.
- [`docs/spec/styling-contract.md`](./docs/spec/styling-contract.md) — stable `data-*` hooks, CSS variables, and Tailwind/headless recipes.
- [`examples/`](./examples/) — classroom one-liner, headless Tailwind, and custom analytics plugin demos.

## Development

```bash
pnpm install
pnpm dev          # all packages in watch mode
pnpm test         # run all suites
pnpm verify       # format + lint + typecheck + test
```

See [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## License

MIT for the core. Premium plugins/themes ship under a separate commercial
license (Phase 8). See [`LICENSE`](./LICENSE).
