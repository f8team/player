# Security model

## Threat model

| Asset                      | Threat                                                      | Mitigation                                                                                                                                                                                                    |
| -------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User session cookies       | Leaked to attacker-controlled CDN through `withCredentials` | `withCredentials` is **opt-in per source**. The `auth-aware` plugin only enables it for explicit URL prefixes (e.g., `https://api-gateway*`).                                                                 |
| Subtitles                  | Malicious VTT injecting markup                              | Browsers parse VTT in a sandboxed context; we do not parse VTT manually. The captions menu only renders the `label` field, escaped.                                                                           |
| Plugin code                | Untrusted plugin from a third party                         | Plugins run in the same JS realm as the host. We document this clearly and recommend consumers review plugins. The plugin API is intentionally narrow (no `eval`, no DOM mutation outside contributed slots). |
| Source URLs                | XSS via `javascript:` URL                                   | The source registry rejects any URL whose protocol is not `http(s):`, `blob:`, `data:` (data: is allowed only for short MP4 demos under a feature flag).                                                      |
| Watermark plugin (premium) | Bypassed by deleting the overlay node                       | The overlay re-renders on a MutationObserver; tampering disconnects playback. Documented as best-effort, not DRM.                                                                                             |

## Safe URL handling

```ts
function assertSafeMediaUrl(url: string): void {
  const parsed = new URL(url, window.location.href);
  if (!["http:", "https:", "blob:", "data:"].includes(parsed.protocol)) {
    throw new PlayerError("unsupported", `Unsupported URL protocol: ${parsed.protocol}`);
  }
}
```

## Cookies

- Default: `withCredentials = false` for every XHR.
- `auth-aware` plugin: enables `withCredentials` only when the URL matches one
  of the configured prefixes. Wildcards are anchored at the start of the URL.
- The plugin documents the F8 default — `https://api-gateway*` — but never
  hard-codes it; consumers must opt in.

## Reporting

See [`SECURITY.md`](../../SECURITY.md). We respond within 72 hours.

## Supply chain

- `pnpm audit` and `npm audit` run in CI.
- Dependabot monitors `packages/*` and the root `devDependencies`.
- All dependencies are pinned through `pnpm-lock.yaml` and verified by `npm provenance` on publish (Phase 7+).
