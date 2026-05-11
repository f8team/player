# ADR 0003: Plugin system shape

- **Status:** Accepted (Phase 0)
- **Date:** 2026-05-11

## Context

The current F8 stack mixes plugin styles: `video.js` plugins are imperative,
modify the player class prototype, and require side-effect imports. `react-player`
config blocks are inert objects. Both styles make tree-shaking inconsistent and
make it hard to reason about teardown.

## Decision

A plugin is a **plain factory** that returns a `PluginInstance`:

```ts
const subtitles = (opts: SubtitlesOptions) =>
  definePlugin({
    name: "subtitles",
    setup(player, host) {
      // attach observers, contribute UI fragments
      const cleanup = host.controls.contribute("menu.captions", () => render(opts));
      const off = player.on("ratechange", noop);
      return () => {
        // teardown
        cleanup();
        off();
      };
    },
  });
```

Consumers pass plugins to the factory:

```ts
const player = createPlayer({ plugins: [subtitles({...}), markers({...})] });
```

## Why

- **Tree-shaking** — a plugin you do not import never lands in the bundle.
- **Lifecycle** — `setup` returns a teardown function. The plugin bus calls
  every teardown on `player.dispose()`. No leaks.
- **Composition** — plugins do not extend the player class. They register UI,
  commands, and subscriptions through a narrow `PluginHost` interface. New
  plugins can layer on top without breaking the contract.
- **Isolation** — `host.controls.contribute(slot, ...)` is the only way to add
  UI. Plugins cannot reach into adapter-specific internals.

## Slot system

Built-in slots include: `seekbar.overlay`, `menu.settings`, `menu.captions`,
`menu.quality`, `menu.playbackrate`, `controls.left`, `controls.right`,
`overlay.center`. Adapters render whatever each plugin contributes into the
matching slot.

## Custom commands

A plugin can register named commands:

```ts
host.commands.add("markers.jumpTo", (time: number) => player.seekTo(time));
player.commands.run("markers.jumpTo", 42);
```

Commands let plugins expose imperative actions consumers can wire into custom
UI (e.g., a transcript list outside the player container that calls
`markers.jumpTo`).

## Trade-offs

- Plugins live in process; a malicious plugin can do anything. We document this
  clearly. (See `docs/spec/security.md`.)
- The `PluginHost` API is small. We will grow it as concrete plugins surface
  needs, not preemptively.
