# Golden case tests

One file per golden case (`G1..G16` from [`docs/spec/golden-cases.md`](../../docs/spec/golden-cases.md)).
Each test exercises the **public API** only. Tests land alongside the matching
phase:

| Case       | Lands in                                                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| G1, G3, G6 | Phase 4 (after `f8-ui` migration).                                                                                               |
| G2         | Phase 4 + the `story-gestures` plugin (Phase 3).                                                                                 |
| G4         | Phase 3 (the `safari-mp4-fallback` plugin) + Phase 4 swap.                                                                       |
| G5         | Phase 4 (composer).                                                                                                              |
| G7..G11    | Phase 5 (after `f8-dash-ui` migration).                                                                                          |
| G12        | Phase 2 (ref API contract).                                                                                                      |
| G13        | Phase 1.F (HLS source provider) + Phase 3 (`auth-aware`).                                                                        |
| G14        | Phase 1.F (`looksLikeHls`) + Phase 3 (`safari-mp4-fallback` is for desktop Safari only; iOS WebKit force-HLS lives in `hls.ts`). |
| G15        | Phase 1.H (`createPlayer.attach`) + Phase 3 (`subtitles`).                                                                       |
| G16        | Phase 1.H + Phase 3 (`keyboard.scope`).                                                                                          |
