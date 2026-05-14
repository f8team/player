# `@f8team/reel-core`

> Headless, framework-agnostic, plugin-driven video player engine. The foundation for every `@f8team/reel-*` adapter and plugin.

```bash
pnpm add @f8team/reel-core
```

## Why headless?

- **Framework-agnostic.** Works with React, Lit, Vue, Svelte, or vanilla DOM.
- **Plugin-driven.** Pay only for the features you import — `subtitles`, `markers`, `hls-quality`, `keyboard`, `pip`, … each ships separately.
- **Tree-shakeable.** Side-effect free; bundlers drop everything you don't use.
- **Tiny.** Hard size budget enforced in CI: <12 KB gzip core (15 KB hard fail).

## Quick start

```ts
import { createPlayer } from "@f8team/reel-core";

const player = createPlayer({
  source: { src: "https://cdn.example.com/master.m3u8" },
  autoplay: "muted",
});

await player.attach(document.querySelector("video")!);
await player.play();
```

## Architecture

See [docs/spec/architecture.md](../../docs/spec/architecture.md) for the state
machine, module layout, lazy loading strategy, and bundle budgets.

## Public API

The contract is frozen in [docs/spec/api-contract.md](../../docs/spec/api-contract.md).
Any change to a public type is a **breaking change** unless explicitly marked
`@internal` or covered by a feature flag.

## License

MIT © F8.
