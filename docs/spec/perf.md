# Performance budgets & enforcement

## Hard CI gates

| Package                                 | Target gzip | CI hard fail |
| --------------------------------------- | ----------- | ------------ |
| `@f8/player-core`                       | <12 KB      | >15 KB       |
| `@f8/player-react`                      | <4 KB       | >5 KB        |
| `@f8/player-plugin-subtitles`           | <2 KB       | >3 KB        |
| `@f8/player-plugin-hls-quality`         | <2.5 KB     | >3 KB        |
| `@f8/player-plugin-markers`             | <2.5 KB     | >3 KB        |
| `@f8/player-plugin-keyboard`            | <1 KB       | >2 KB        |
| `@f8/player-plugin-touch-gestures`      | <2 KB       | >3 KB        |
| `@f8/player-plugin-resume-position`     | <1 KB       | >2 KB        |
| `@f8/player-plugin-auth-aware`          | <1 KB       | >2 KB        |
| `@f8/player-plugin-story-gestures`      | <2 KB       | >3 KB        |
| `@f8/player-plugin-safari-mp4-fallback` | <1 KB       | >2 KB        |
| `@f8/player-plugin-analytics`           | <2 KB       | >3 KB        |
| `@f8/player-plugin-pip`                 | <1 KB       | >2 KB        |
| `@f8/player-plugin-watermark`           | <1.5 KB     | >2 KB        |
| Each theme CSS                          | <1.5 KB     | >2 KB        |

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
  `size-limit` config and break the build on regression.
- **Runtime:** Lighthouse CI with a custom `player-perf` audit (Phase 7).
- **Memory leaks:** disposal tests in Vitest assert that `dispose()` returns the
  internal Set sizes to zero.
