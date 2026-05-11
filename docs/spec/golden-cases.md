# Golden cases

These are the **16 production behaviors** the player must support without
regression. They are the test bedrock for every phase. Any change to the API or
defaults that breaks one of these is a breaking change and must ship under a
major version bump with a documented migration path.

Source of truth: audited from `f8-ui` and `f8-dash-ui` on 2026-05-11.

## Public surfaces (`f8-ui`)

### G1. Course learning step (HLS, multi-language subtitles, native controls)

- **Source:** `playlist_url` (HLS m3u8) preferred; falls back to `video_url` (MP4).
- **Subtitles:** `<track kind="subtitles">` per language. Default selection priority: explicit `default === true` → Vietnamese (`code === "vi"`) → first entry. (Reference: [`buildSubtitleTracks.ts`](../../../f8-ui/src/pages/Learning/Video/buildSubtitleTracks.ts).)
- **Controls:** native browser controls.
- **Keyboard:** Space toggles play/pause when `document.body` is the active element. ArrowLeft/ArrowRight seek -5 / +5 seconds.
- **Tracking:** `onProgress` fires at 500 ms intervals; the consumer POSTs `saveProgress` with `{ track_step_id, playedSeconds }` and again with `isEndedVideo: true` on `onEnded`.
- **Poster:** `step.image_url` rendered as `<video poster>` and as `light` mode (preview thumbnail until first play) when `autoplay === false`.
- **Auth:** HLS segments under `https://api-gateway*` ship `withCredentials = true`; the BE sends VTT with `Access-Control-Allow-Origin: *` and the player adds `crossOrigin="anonymous"`.

### G2. Story full-bleed (Instagram-style, custom chrome)

- **Source:** `playlist_url` or `video_url`. iOS WebKit + URL looks-like-HLS forces hls.js (`forceHLS: true`); other Safari paths leave the native engine alone.
- **Controls:** `controls={false}` — fully custom chrome (progress segments, mute toggle, play/pause overlay, action rail, reaction floaters).
- **Autoplay:** `autoplay` muted; user can unmute via direct-unmute prompt.
- **Gestures:** tap left/right navigates story; tap-and-hold pauses; double-tap on the surface emits a reaction.
- **Progress segments:** the parent component drives a manual progress bar from `onProgress.playedSeconds / onDuration.duration`.
- **Engagement ping:** `recordStoryEngaged(storyId)` is called once `playedSeconds >= 1`.
- **`blockSpaceToggle`:** when set, the global Space hotkey is suppressed (the parent handles auth-gated playback prompts).
- **Status guards:** the `<video>` only mounts when `story.status === "ready"`; `processing` and `failed` show their own messages.
- **playsInline:** `playsInline + webkit-playsinline` are mandatory on iOS to avoid native fullscreen takeover.

### G3. Public video detail page (`/videos/:slug`)

- **Source:** `playlist_url` or `video_url`.
- **Controls:** native, autoplay enabled.
- **No subtitle tracks, no keyboard overrides beyond defaults.**

### G4. Course preview modal (Safari escape hatch)

- **Source:** `course.video_url`.
- **Engine selection:** when `isDesktopSafari() && course.video_type === "upload"`, the surface uses a plain `<video><source type="video/mp4" />` instead of the HLS path. Anywhere else uses the player. (Plugin name: `safari-mp4-fallback`.)

### G5. Story composer blob preview

- **Source:** browser-generated `blob:` URL from a freshly selected file.
- **Engine:** native `<video>` with `muted`, `playsInline`, `controls`, `preload="metadata"`. The player wrapper is a thin pass-through here (no HLS needed).

### G6. Landing page hero loops

- **Sources:** small MP4 hero clips inlined per landing variant.
- **Engine:** native `<video>` with `autoPlay muted loop playsInline`.
- **Theme:** `minimal` (no controls; optional click-to-unmute overlay).

## Admin surfaces (`f8-dash-ui`)

### G7. Course video lesson editor (HLS quality, hotkeys, playback rates)

- **Source:** Auto-detect: `youtube.com` URL → YouTube source; `blob:` or `.mp4` → MP4; else HLS m3u8.
- **HLS quality menu:** must enumerate variant qualities (mirrors `videojs-hls-quality-selector`).
- **Hotkeys:** F or Ctrl/Cmd+Enter for fullscreen, Space for play/pause, ±10s seek (mirrors `videojs-hotkeys` + `videojs-seek-buttons`).
- **Playback rates:** `[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75]`.
- **Auth:** `xhr.withCredentials = true` for any URI starting with `https://api-gateway*`.

### G8. Transcript / chapter markers

- **Data shape:** `{ start_time: string | number, title: string }[]`. `start_time` strings pass through `durationToSeconds`.
- **Render:** marker pips on the seek bar; tooltip on hover; click jumps to the timestamp.
- **External seek:** the consumer can call `playerHandle.seekTo(seconds | "00:01:23")` from a transcript list to jump.
- **Reactivity:** when the markers array changes, the existing markers are replaced cleanly (no flicker).

### G9. Subtitle editor preview

- **Source:** same source as the lesson; markers are empty.
- **Behavior:** the editor calls `playerHandle.seekTo(cue.start)` when the user clicks a cue.

### G10. Media manager modal preview

- **Source:** direct CDN URL (often MP4).
- **Engine:** the player with `theme="minimal"` and `controls`. (Replaces the bare `<video>` currently used.)

### G11. YouTube tech (admin upload preview)

- **Detection:** `youtube.com` substring in the URL.
- **Engine:** lazy-loaded YouTube source (replaces `videojs-youtube`).
- **Controls:** native YouTube controls; the player still owns the imperative `play / pause / seekTo` ref.

### G12. Imperative ref API (back-compat)

The React adapter exposes `VideoPlayerHandle` with methods used by current consumers. The legacy method `restore()` is preserved.

```ts
interface VideoPlayerHandle {
  play(): void;
  pause(): void;
  paused(): boolean;
  seekTo(seconds: number): void;
  restore(): void; // resume the playback state captured by the most recent pause()
}
```

## Cross-cutting

### G13. Authenticated HLS — 401 / 403 surfacing

- **Triggered when:** any HLS XHR (manifest or segment) ends with status 401 or 403.
- **Action:** call `onUnauthorized()` (or the legacy alias `onStreamUnauthorized`) at most once per `source.src`. The callback is reset whenever the source changes.
- **Use cases:** unauthenticated guest viewing a paid lesson; expired session.

### G14. iOS playsInline + force-HLS

- iOS WebKit must not enter fullscreen on play. The player always sets `playsInline` and `webkit-playsinline`.
- For `.m3u8` URLs on iOS WebKit the player loads `hls.js` (forceHLS) so the manifest XHR runs through `xhrSetup` and 401/403 is surfaced.

### G15. VTT cross-origin

- The `<video>` element sets `crossOrigin="anonymous"` whenever any subtitle track is provided. The BE must respond with `Access-Control-Allow-Origin: *` on the VTT endpoint.

### G16. Custom chrome — keyboard scoping

- When `controls === false` and the consumer drives its own UI (story, embedded surfaces), the player's global Space and Arrow handlers can be disabled with `blockSpaceToggle` / `blockArrowKeys`. This avoids double-handling when the parent already binds keys.

---

## Test mapping

Each golden case maps to a behavior test stored at `tests/golden/<case-id>.test.ts`. The test suite is wired into Phase 0 and runs on every PR.
