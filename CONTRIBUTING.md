# Contributing to Reel

Thanks for taking the time to contribute. This document is intentionally short:
the rules below catch >95% of pitfalls; everything else lives in the code review
graph and the spec docs under [`docs/spec/`](./docs/spec/).

## Local setup

```bash
pnpm install
pnpm verify       # format:check + lint + typecheck + test
```

Node 20+, pnpm 9+. The repo is a Turbo + pnpm workspace.

## Project structure

```
packages/
  core/                 # @f8team/reel-core         (headless, no DOM beyond HTMLMediaElement)
  react/                # @f8team/reel-react        (React adapter)
  themes/               # @f8team/reel-themes       (CSS variables presets)
  plugin-*/             # individual plugins; each ships its own bundle
examples/               # consumer demo apps
docs/spec/              # locked contracts (golden cases, API, architecture, ADRs)
plans/                  # phased plan files (see required.mdc)
tests/                  # cross-package golden suite
```

## Hard rules

1. **The core never imports a framework.** No React, no Lit, no DOM utility libraries
   beyond what `HTMLMediaElement` already exposes.
2. **HLS / YouTube / DASH SDKs are lazy-imported.** A consumer who never plays HLS
   pays 0 KB for `hls.js`.
3. **Bundle budgets are hard CI gates.** Core <15 KB gzip, React adapter <5 KB,
   each plugin <3 KB, each theme <2 KB. See [`docs/spec/perf.md`](./docs/spec/perf.md).
4. **A11y is non-negotiable.** Every interactive control has an ARIA role, a label,
   and keyboard reachability. The Storybook a11y addon must report zero violations.
5. **No behavior change inside refactors.** Pin behavior with characterization tests
   first, then refactor, then optimize.
6. **Every public function has at least two test inputs.** Pure helpers: normal +
   edge. Non-pure: assert observable side effects.

## Commit & PR

- Conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`).
- One feature = one PR = one changeset (`pnpm changeset`).
- Squash-merge into `main`. Releases ship via `pnpm release` (Phase 7+).

## Plan-driven workflow

Anything spanning multiple files / packages / phases lives in
[`plans/f8-player.md`](./plans/f8-player.md). Update the plan as you progress;
check `[x]` immediately when each atomic todo finishes.

## Reporting bugs

Open an issue with:

- A failing test or a minimal repro link (Sandpack / StackBlitz).
- The browser, OS, and player version.
- The relevant plugins and theme.

Security disclosures: email security@f8.example (Phase 8 — placeholder).
