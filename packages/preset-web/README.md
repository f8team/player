# `@f8/player-preset-web`

Opinionated F8 web player preset: plugin factory + one-liner components.

## When to use what

| | `<F8WebPlayer>` (React) / `<f8-web-player>` (Lit) | `createF8WebPlayerPlugins` + `<Player.Root>` |
|---|---|---|
| **Use when** | 80% case: course lesson, admin preview, story embed | Custom layout, headless UI, or complex slot arrangement |
| **Setup** | One import, done | Manual plugin wiring + compose primitives |
| **Override** | Props for common toggles | Full control |
| **Bundle delta** | ~1.5 KB extra vs factory-only | 0 extra |

**Rule of thumb:** start with the one-liner, drop down to primitives only when you outgrow it.

---

## `<F8WebPlayer>` (React one-liner)

Ships Vietnamese labels, classroom controls, prefs persistence, auth-aware HLS,
buffering spinner, and optional light overlay — all in one prop.

```tsx
import { F8WebPlayer } from "@f8/player-preset-web";

// Minimal
<F8WebPlayer src="https://cdn.example.com/lesson.m3u8" />

// Full source descriptor
<F8WebPlayer
  source={{ src: "https://cdn.example.com/lesson.m3u8", tracks: [...] }}
  poster="https://cdn.example.com/poster.jpg"
  light  // show poster + play-button before first play
  onPlay={() => trackEvent("play")}
  onEnded={onLessonComplete}
/>

// Opt-out prefs, custom labels
import { defaultLabels } from "@f8/player-preset-web";
<F8WebPlayer src="..." plugins={{ prefs: false }} labels={defaultLabels} />
```

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `src` | `string` | — | Quick shorthand — sets `source.src` |
| `source` | `SourceDescriptor` | — | Full source (src, tracks, withCredentials, …) |
| `poster` | `string` | — | Poster URL; also used by light overlay |
| `light` | `boolean \| string` | — | Light overlay — `true` = use poster, `string` = custom URL |
| `muted` | `boolean` | — | Initial muted state |
| `volume` | `number` | — | Initial volume `0–1` |
| `playbackRate` | `number` | — | Initial playback rate |
| `playbackRates` | `readonly number[]` | `[0.5…2]` | Custom rate menu |
| `labels` | `Partial<PlayerLabels>` | `vietnameseLabels` | i18n labels |
| `plugins` | `F8WebPlayerPluginsOptions` | — | Override plugin tuple options |
| `options` | `PlayerOptions` | — | Extra raw player options |
| `playerRef` | `RefObject<Player>` | — | Imperative player access |
| `controls` | `boolean` | `true` | Show default controls bar |
| `children` | `ReactNode` | — | Custom slot rendered above controls |
| `onPlay/onPause/…` | callbacks | — | All `PlayerCallbackProps` forwarded |

---

## `<f8-web-player>` (Lit one-liner)

```html
<script type="module">
  import { defineF8WebPlayer } from "@f8/player-preset-web";
  defineF8WebPlayer();
</script>

<f8-web-player
  theme="classroom"
  controls
></f8-web-player>

<script>
  const el = document.querySelector("f8-web-player");
  el.source = { src: "https://cdn.example.com/lesson.m3u8" };
  el.addEventListener("f8:play", () => console.log("playing"));
</script>
```

---

## `createF8WebPlayerPlugins` (v2 factory)

Returns the standard plugin tuple. Use this when you compose `<Player.Root>` directly.

```ts
import { createF8WebPlayerPlugins, DEFAULT_F8_GATEWAY_ALLOWLIST } from "@f8/player-preset-web";

const plugins = createF8WebPlayerPlugins({
  auth: { allowlist: DEFAULT_F8_GATEWAY_ALLOWLIST },
  prefs: { storageKey: "my-player" },  // or `false` to disable
  keyboard: { blockKeys: ["Space"] },  // block space only (story auth-gate)
  markers: { items: transcriptList },
});
```

### `F8WebPlayerPluginsOptions`

| Key | Type | Default | Description |
|---|---|---|---|
| `auth` | `{ allowlist: string[] }` | `[]` | auth-aware allowlist for `withCredentials` |
| `prefs` | `false \| PrefsPluginOptions` | `{}` (on) | prefs persistence; `false` to skip |
| `keyboard` | `KeyboardOptions` | F8 defaults | keyboard plugin options |
| `markers` | `MarkersOptions` | — | timeline markers |
| `hls` | `HlsQualityOptions` | — | HLS quality plugin options |
| `thumbnails` | `ThumbnailsOptions` | — | preview thumbnails |

---

## Migration from v1 plugin tuple

```ts
// v1 — manual
import { createAuthAwarePlugin, createPrefsPlugin, createKeyboardPlugin } from "@f8/player-*";
const plugins = [createKeyboardPlugin(), createAuthAwarePlugin(allowlist), createPrefsPlugin()];

// v2 — factory
import { createF8WebPlayerPlugins } from "@f8/player-preset-web";
const plugins = createF8WebPlayerPlugins({
  auth: { allowlist },
  prefs: {},
});
```
