# Caption / subtitle integration (F8 players)

Consumers should agree with the backend on **one delivery shape** per surface. `@f8/player-preset-web` only ships the **`@f8/player-plugin-subtitles`** path when configured with `{ subtitles: { … } }`.

## Mode A — Tracks on source + subtitles plugin (`f8-ui`, `f8-dash-ui`)

- API includes `tracks[]` (native `TextTrack` descriptors).
- Install preset with **`subtitles`** options (see `VideoPlayer`, `VideoUploadPreview`).
- Thumbnails sprite remains optional on `source.thumbnails`; thumbnails plugin mounts with `thumbnails: 'always'` so late `sprite_url` / preview URL upgrades still work after `setSource`.

## Mode B — Signed subtitle URL + native `<track>` (`f8-pro-ui`)

- API exposes `subtitles_url` (often signed).
- **`createF8WebPlayerPlugins({ subtitles: false })`** — Pro skips the subtitles plugin on purpose.
- `createCaptionsController` fetches the URL, attaches `<track>`, and keeps caption UI in sync (`vjs-captions` visibility policy).
- **Auth / 401**: Pro keeps **`createRefreshTokenController`** (and gateway `withCredentials` on `SourceDescriptor`). Do **not** add **`createAuthAwarePlugin`** alongside it unless an explicit audit shows both are required; duplicate refresh paths race.

When adding a fourth consumer, choose A or B from payload reality; mixing both plugins and the captions controller on the same surface is redundant and risks double tracks.
