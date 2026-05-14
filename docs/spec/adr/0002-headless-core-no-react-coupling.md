# ADR 0002: Headless core with no React coupling

- **Status:** Accepted (Phase 0)
- **Date:** 2026-05-11

## Context

We have three F8 surfaces using three different stacks (React for `f8-ui` and
`f8-dash-ui`, Lit for `f8-pro-ui`). The current state ships **three different
players** because each was built tightly bound to its host framework. We do not
want to repeat that mistake.

## Decision

`@f8team/reel-core` is **framework-agnostic**. It depends only on
`HTMLMediaElement` and the standard DOM APIs needed for fullscreen / PIP /
captions. It exports a `createPlayer(options)` factory that returns a
`Player` instance — a plain TypeScript object with methods, an event bus, and a
reactive store.

Framework adapters (`@f8team/reel-react`, `@f8team/reel-lit`, etc.) are thin layers
over the core. They translate framework idioms (hooks, custom elements,
reactive controllers, signals) to subscriptions on the core's store.

## Why

- A bug fix in the core ships to every framework simultaneously.
- A new feature (e.g., DASH support) lands once and is available everywhere.
- The bundle pays for **one** engine, not three.
- The contract shifts left: the public API is the core's API. Adapters are
  syntactic sugar.

## Trade-offs

- React idioms (refs, declarative props) cost a small amount of glue inside
  the adapter. We accept this cost.
- The core cannot use `useState` / `signals`. It implements its own minimal
  reactive store (~50 LOC), tested separately.

## Constraints

- The core cannot import `react`, `react-dom`, `lit`, `vue`, `@vue/reactivity`,
  `solid-js`, or any DOM utility library. The dependency manifest is a
  whitelist; CI fails on any unexpected addition.
- The core is built once and consumed by every adapter through `workspace:*`.

## Consequences

- Contributors must keep framework concerns out of the core.
- The React adapter has the most surface area today; future adapters will
  rediscover edge cases. We document them in `docs/spec/adapter-checklist.md`
  (Phase 9).
