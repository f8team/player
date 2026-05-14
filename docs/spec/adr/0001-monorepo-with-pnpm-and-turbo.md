# ADR 0001: Monorepo with pnpm + Turbo

- **Status:** Accepted (Phase 0)
- **Date:** 2026-05-11

## Context

We need to ship `@f8team/reel-core`, a React adapter, an eventual Lit/Vue/Vanilla
adapter, plus 12 plugins and 4 themes. Each is independently versioned and
independently consumable, but they share TypeScript build settings, ESLint,
Prettier, Vitest, and CI gates. Some plugins depend on the core's TypeScript
build outputs; the React adapter depends on the core; and the consumer demos
depend on everything.

## Decision

We use **pnpm workspaces** for dependency management and **Turbo** for the task
graph and remote build cache.

## Why pnpm

- Strict, deterministic node_modules — catches phantom dependencies that the
  npm flat-tree hides.
- First-class workspace protocol (`workspace:*`) without extra plugins.
- Hoisted-only-when-asked: each package gets exactly the deps it declares,
  matching how the published artifact will behave on a consumer's machine.
- Faster cold install than npm/yarn classic; faster than yarn berry for our
  size.

## Why Turbo

- Hash-based remote caching, free for OSS, makes CI 5–10× faster on repeat
  runs.
- Topological task graph (`build` waits for `^build`) without a custom script.
- Outputs / inputs declarations make the cache safe.

## Alternatives considered

- **Nx** — more powerful, more complex, more learning curve. Wins on 10+ apps;
  loses on a 15-package library that primarily ships TS.
- **Lerna** — community has effectively deprecated it in favor of Nx/Turbo.
- **Yarn Berry workspaces** — strong, but Plug'n'Play surfaces edge cases for
  publishing pure TS libraries to npm consumers.
- **No monorepo, separate repos** — the cross-cutting refactor cost (changing
  the core type forces 14 PR rounds) is unacceptable.

## Consequences

- Contributors install `pnpm` once (`corepack enable`).
- CI install speed depends on a warm pnpm-store cache (mounted volume).
- Per-package build outputs (`dist/`) are cached by Turbo — local rebuild of
  unchanged packages is near-instant.
