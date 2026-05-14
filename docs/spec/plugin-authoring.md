# Plugin authoring cookbook

This cookbook shows how to write a small `@f8team/reel-core` plugin and wire it to
React/Lit consumers without leaking subscribers or coupling UI to implementation
details.

## 1. Mental model

A plugin is a `PluginInstance`:

```ts
import { definePlugin } from "@f8team/reel-core";

export const myPlugin = definePlugin({
  name: "my-plugin",
  setup(player, host) {
    return () => {
      // cleanup
    };
  },
});
```

`setup()` runs once when the plugin is registered via `options.plugins` or
`player.use(plugin)`.

Use the two surfaces intentionally:

| Surface  | Use for                                                                   |
| -------- | ------------------------------------------------------------------------- |
| `player` | Public playback API: `play`, `pause`, `seekTo`, events, commands          |
| `host`   | Extension API: state subscription, commands, custom events, control slots |

## 2. Lifecycle checklist

Every plugin should be safe across mount → source change → unmount:

1. Register event listeners / store subscriptions in `setup`.
2. Keep every disposer returned by `player.on`, `host.store.subscribe`,
   `host.commands.add`, or `host.controls.contribute`.
3. Return one teardown function that calls all disposers.
4. Abort network work in teardown.
5. Do not keep module-level mutable state unless the plugin is intentionally
   global.

```ts
setup(player, host) {
  const disposers = [
    player.on("play", () => host.emit("example:play")),
    host.commands.add("example:reset", () => reset()),
  ];

  return () => {
    for (const dispose of disposers) dispose();
  };
}
```

## 3. Commands

Commands are the best way for UI to push reactive data into a plugin.

Name commands with the plugin namespace:

```ts
host.commands.add("chapters:setItems", (items: Chapter[]) => {
  chapters = items;
  host.emit("chapters:changed", { items });
});
```

React consumers can update the command from props/state:

```tsx
import { useMemo } from "react";
import { usePluginCommand } from "@f8team/reel-react";

function ChaptersBridge({ items }: { items: Chapter[] }) {
  const stableItems = useMemo(() => items, [items]);
  usePluginCommand("chapters:setItems", stableItems);
  return null;
}
```

Guidelines:

- Missing commands are safe: `usePluginCommand` swallows unregistered commands.
- Keep command payloads serializable when possible.
- Prefer one command per intent (`setItems`, `clear`, `reload`) over a boolean
  mode flag.

## 4. State subscriptions

Use `host.store.subscribe(selector, listener)` for state-driven work.

```ts
const unsubscribe = host.store.subscribe(
  (state) => state.source?.src,
  (src) => {
    if (!src) clear();
    else warmup(src);
  },
);
```

Keep selectors small. A selector that returns the whole state will run on every
update and can force unnecessary work during `timeupdate`.

## 5. Custom events

Emit events for UI state that should stay synchronous in controls:

```ts
host.emit("chapters:changed", { items });
host.emit("chapters:cleared", undefined);
```

React/Lit controls can subscribe through the public player event bus. Use the
same `plugin:verb` namespace as commands.

## 6. SSR and lazy loading

Plugins may be constructed during SSR. Avoid touching `window`, `document`,
`HTMLVideoElement`, or `localStorage` at module top-level.

Good:

```ts
setup() {
  if (typeof window === "undefined") return;
  const storage = window.localStorage;
}
```

For optional heavy plugins, install a tiny bootstrap plugin and dynamic-import the
real plugin after the source proves it is needed. `@f8team/reel-preset-web` uses
this pattern for thumbnails.

## 7. Testing pattern

Write tests around observable behavior:

| Plugin behavior    | Test assertion                              |
| ------------------ | ------------------------------------------- |
| Event listener     | Fire the event, assert sink/emit called     |
| Store subscription | Change selected state, assert side effect   |
| Command            | Run command, assert state/event update      |
| Cleanup            | Call teardown, assert disposer/abort called |
| Network            | Mock fetch, assert abort/retry/error path   |

Do not test that `setup()` merely "does not throw"; assert the side effect that
the consumer relies on.

## 8. Walkthrough: analytics sink plugin

```ts
import { definePlugin, type PluginInstance } from "@f8team/reel-core";

export interface AnalyticsSink {
  track(event: string, payload?: Record<string, unknown>): void;
}

export function createAnalyticsSinkPlugin(sink: AnalyticsSink): PluginInstance {
  return definePlugin({
    name: "analytics-sink",
    setup(player) {
      let lastProgressSecond = -1;

      const offPlay = player.on("play", () => {
        sink.track("play");
      });

      const offPause = player.on("pause", () => {
        sink.track("pause");
      });

      const offTimeupdate = player.on("timeupdate", ({ currentTime, duration }) => {
        const second = Math.floor(currentTime);
        if (second === lastProgressSecond || second % 15 !== 0) return;
        lastProgressSecond = second;
        sink.track("progress", { currentTime: second, duration });
      });

      return () => {
        offPlay();
        offPause();
        offTimeupdate();
      };
    },
  });
}
```

Use it with React primitives:

```tsx
const plugins = [
  createAnalyticsSinkPlugin({
    track: (event, payload) => analytics.track(event, payload),
  }),
];

<Player.Root options={{ plugins }} source={{ src: lessonUrl }}>
  <Player.Video />
  <Player.Controls.Bar />
</Player.Root>;
```

## 9. Common mistakes

- Registering commands or events without returning cleanup.
- Returning a new object/array from a store selector on every tick.
- Calling browser APIs at module top-level.
- Using generic command names like `setData` instead of `plugin:setData`.
- Letting plugin setup throw for optional features; emit a clear event or no-op
  when the feature is unavailable.
