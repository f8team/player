# Performance budgets & enforcement

## Hard CI gates

| Package                                   | CI limit                          |
| ----------------------------------------- | --------------------------------- |
| `@f8team/reel-core`                       | <12 KB target / <15 KB hard cap   |
| `@f8team/reel-react`                      | <12 KB target / <13 KB hard cap   |
| `@f8team/reel-lit`                        | <12 KB target / <13 KB hard cap   |
| `@f8team/reel-preset-web`                 | <6 KB factory / <7 KB full export |
| `@f8team/reel-plugin-prefs`               | <2 KB gzip                        |
| `@f8team/reel-plugin-subtitles`           | <3 KB gzip                        |
| `@f8team/reel-plugin-hls-quality`         | <3 KB gzip                        |
| `@f8team/reel-plugin-markers`             | <3 KB gzip                        |
| `@f8team/reel-plugin-thumbnails`          | <3 KB gzip                        |
| `@f8team/reel-plugin-keyboard`            | <3 KB gzip                        |
| `@f8team/reel-plugin-touch-gestures`      | <3 KB gzip                        |
| `@f8team/reel-plugin-resume-position`     | <3 KB gzip                        |
| `@f8team/reel-plugin-auth-aware`          | <3 KB gzip                        |
| `@f8team/reel-plugin-story-gestures`      | <3 KB gzip                        |
| `@f8team/reel-plugin-safari-mp4-fallback` | <3 KB gzip                        |
| `@f8team/reel-plugin-analytics`           | <3 KB gzip                        |
| `@f8team/reel-plugin-fullscreen`          | <3 KB gzip                        |
| `@f8team/reel-plugin-pip`                 | <3 KB gzip                        |
| `@f8team/reel-plugin-watermark`           | <3 KB gzip                        |
| Each theme CSS                            | <4 KB brotli                      |

`hls.js` and the YouTube IFrame API are **lazy-loaded** and not counted in the
package totals.

## Runtime targets

| Metric                          | Target (p75) | Notes                                                                      |
| ------------------------------- | ------------ | -------------------------------------------------------------------------- |
| Time to first frame (HLS)       | <500 ms      | Fixture: 1080p VOD on a Chromium emulated 4G profile.                      |
| Time to first frame (MP4)       | <250 ms      | Same fixture.                                                              |
| `play()` to `playing` event     | <100 ms      | Once metadata is loaded.                                                   |
| `seekTo` to `seeked` event      | <300 ms      | HLS variant; MP4 should be near-instant.                                   |
| Re-render count on `timeupdate` | 0            | Time UI subscribes through a selector; only the time component re-renders. |

## Tooling

- **Bundle:** `size-limit` per package; thresholds above are encoded in
  `.size-limit.json` config and break the build on regression.
- **Runtime:** Lighthouse CI with a custom `player-perf` audit (Phase 7).
- **Memory leaks:** disposal tests in Vitest assert that `dispose()` returns the
  internal Set sizes to zero.
