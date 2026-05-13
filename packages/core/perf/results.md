# Core runtime benchmark results

## 2026-05-13 — `timeupdate` selector subscribers

Command:

```bash
NO_COLOR=1 pnpm -C packages/core perf:timeupdate
```

Scenario:

- 60 fps `timeupdate` dispatch loop for 60 seconds.
- 3,600 `timeupdate` events.
- 5 selector subscribers:
  - `currentTime`
  - `Math.floor(currentTime)`
  - progress ratio
  - buffered range count
  - source URL
- Synchronous store flushing (`scheduleFlush: (run) => run()`) to measure store/subscriber overhead directly.

Result:

| Metric                         |         Value |
| ------------------------------ | ------------: |
| Test result                    |    1/1 passed |
| Elapsed benchmark time         |     15.097 ms |
| Average store overhead / frame |     0.0042 ms |
| 60 fps frame budget            |    16.6667 ms |
| Internal overhead threshold    | <1 ms / frame |
| Estimated fps capacity         |   238,458 fps |
| Selector runs                  |        18,005 |
| Subscriber callback calls      |         7,260 |

Conclusion: the core store stays well below the 60 fps frame budget with 5 selector subscribers and does not show observable frame-drop pressure in this synthetic benchmark.
