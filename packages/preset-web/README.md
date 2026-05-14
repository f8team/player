# `@f8team/reel-preset-web`

Opinionated Reel web player preset: plugin factory + one-liner components.

## When to use what

|                  | `<ReelWebPlayer>` (React) / `<reel-web-player>` (Lit) | `createReelWebPlayerPlugins` + `<Player.Root>`          |
| ---------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| **Use when**     | 80% case: course lesson, admin preview, story embed   | Custom layout, headless UI, or complex slot arrangement |
| **Setup**        | One import, done                                      | Manual plugin wiring + compose primitives               |
| **Override**     | Props for common toggles                              | Full control                                            |
| **Bundle delta** | ~1.5 KB extra vs factory-only                         | 0 extra                                                 |

**Rule of thumb:** start with the one-liner, drop down to primitives only when you outgrow it.

---

## `<ReelWebPlayer>` (React one-liner)

Ships Vietnamese labels, classroom controls, prefs persistence, auth-aware HLS,
buffering spinner, and optional light overlay — all in one prop.

```tsx
import { ReelWebPlayer } from "@f8team/reel-preset-web";

// Minimal
<ReelWebPlayer src="https://cdn.example.com/lesson.m3u8" />

// Full source descriptor
<ReelWebPlayer
  source={{ src: "https://cdn.example.com/lesson.m3u8", tracks: [...] }}
  poster="https://cdn.example.com/poster.jpg"
  light  // show poster + play-button before first play
  onPlay={() => trackEvent("play")}
  onEnded={onLessonComplete}
/>

// Opt-out prefs, custom labels
import { defaultLabels } from "@f8team/reel-preset-web";
<ReelWebPlayer src="..." plugins={{ prefs: false }} labels={defaultLabels} />
```

### Props

| Prop               | Type                          | Default            | Description                                                |
| ------------------ | ----------------------------- | ------------------ | ---------------------------------------------------------- |
| `src`              | `string`                      | —                  | Quick shorthand — sets `source.src`                        |
| `source`           | `SourceDescriptor`            | —                  | Full source (src, tracks, withCredentials, …)              |
| `poster`           | `string`                      | —                  | Poster URL; also used by light overlay                     |
| `light`            | `boolean \| string`           | —                  | Light overlay — `true` = use poster, `string` = custom URL |
| `muted`            | `boolean`                     | —                  | Initial muted state                                        |
| `volume`           | `number`                      | —                  | Initial volume `0–1`                                       |
| `playbackRate`     | `number`                      | —                  | Initial playback rate                                      |
| `playbackRates`    | `readonly number[]`           | `[0.5…2]`          | Custom rate menu                                           |
| `labels`           | `Partial<PlayerLabels>`       | `vietnameseLabels` | i18n labels                                                |
| `plugins`          | `ReelWebPlayerPluginsOptions` | —                  | Override plugin tuple options                              |
| `options`          | `PlayerOptions`               | —                  | Extra raw player options                                   |
| `playerRef`        | `RefObject<Player>`           | —                  | Imperative player access                                   |
| `controls`         | `boolean`                     | `true`             | Show default controls bar                                  |
| `children`         | `ReactNode`                   | —                  | Custom slot rendered above controls                        |
| `onPlay/onPause/…` | callbacks                     | —                  | All `PlayerCallbackProps` forwarded                        |

---

## `<reel-web-player>` (Lit one-liner)

```html
<script type="module">
  import { defineReelWebPlayer } from "@f8team/reel-preset-web";
  defineReelWebPlayer();
</script>

<reel-web-player theme="classroom" controls></reel-web-player>

<script>
  const el = document.querySelector("reel-web-player");
  el.source = { src: "https://cdn.example.com/lesson.m3u8" };
  el.addEventListener("f8:play", () => console.log("playing"));
</script>
```

---

## `createReelWebPlayerPlugins` (v2 factory)

Returns the standard plugin tuple. Use this when you compose `<Player.Root>` directly.

```ts
import {
  createReelWebPlayerPlugins,
  DEFAULT_REEL_GATEWAY_ALLOWLIST,
} from "@f8team/reel-preset-web";

const plugins = createReelWebPlayerPlugins({
  auth: { allowlist: DEFAULT_REEL_GATEWAY_ALLOWLIST },
  prefs: { storageKey: "my-player" }, // or `false` to disable
  keyboard: { blockKeys: ["Space"] }, // block space only (story auth-gate)
  markers: { items: transcriptList },
});
```

### `ReelWebPlayerPluginsOptions`

| Key          | Type                          | Default     | Description                                |
| ------------ | ----------------------------- | ----------- | ------------------------------------------ |
| `auth`       | `{ allowlist: string[] }`     | `[]`        | auth-aware allowlist for `withCredentials` |
| `prefs`      | `false \| PrefsPluginOptions` | `{}` (on)   | prefs persistence; `false` to skip         |
| `keyboard`   | `KeyboardOptions`             | F8 defaults | keyboard plugin options                    |
| `markers`    | `MarkersOptions`              | —           | timeline markers                           |
| `hls`        | `HlsQualityOptions`           | —           | HLS quality plugin options                 |
| `thumbnails` | `ThumbnailsOptions`           | —           | preview thumbnails                         |

---

## Migration from v1 plugin tuple

```ts
// v1 — manual
import { createAuthAwarePlugin, createPrefsPlugin, createKeyboardPlugin } from "@f8team/reel-*";
const plugins = [createKeyboardPlugin(), createAuthAwarePlugin(allowlist), createPrefsPlugin()];

// v2 — factory
import { createReelWebPlayerPlugins } from "@f8team/reel-preset-web";
const plugins = createReelWebPlayerPlugins({
  auth: { allowlist },
  prefs: {},
});
```
