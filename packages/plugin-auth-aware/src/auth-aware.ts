import type { Player, PluginHost, PluginInstance } from "@f8/player-core";

/**
 * Matcher for the auth-aware allowlist. Three forms are accepted so
 * consumers can pick the one with the least ambiguity (A12 in the
 * 2026-05-12 review):
 *
 * - **`string`** — treated as a **prefix** match on the URL
 *   (`source.src.startsWith(prefix)`). Does NOT implicitly treat a
 *   trailing dot as a separator; `"https://api-gateway"` matches both
 *   `https://api-gateway.example.com/...` and `https://api-gateway-v2/...`.
 * - **`RegExp`** — `.test(url)`. Use this when a prefix isn't precise
 *   enough (e.g. you want the dot to matter: `/^https:\/\/api-gateway\.\w/`).
 * - **function** — `(url: string) => boolean`. Use for fully custom logic.
 */
export type AuthAwareAllowlistEntry = string | RegExp | ((url: string) => boolean);

export interface AuthAwarePluginOptions {
  /**
   * List of URL matchers for sources that require credentials / session
   * cookies. Each entry may be a string prefix, a `RegExp`, or a function.
   *
   * Two consumer snippets that confused each other in the past:
   *
   * ```ts
   * // f8-ui — prefix match, includes subdomains starting with "api-gateway":
   * allowlist: ["https://api-gateway"]
   *
   * // f8-dash-ui — regex match, requires the dot after "api-gateway":
   * allowlist: [/^https:\/\/api-gateway\./]
   * ```
   */
  allowlist?: AuthAwareAllowlistEntry[];
  /**
   * Callback invoked when a 401 / 403 is received from the media server.
   * Use this to show a "login required" modal or refresh the token.
   */
  onUnauthorized?: (url: string, status: 401 | 403) => void;
  /**
   * Whether to automatically pause playback when unauthorized.
   * Defaults to `true`.
   */
  pauseOnUnauthorized?: boolean;
}

const PLUGIN_NAME = "auth-aware";

/** Test a url against one allowlist entry with explicit string-prefix semantics. */
function matches(entry: AuthAwareAllowlistEntry, url: string): boolean {
  if (typeof entry === "string") return url.startsWith(entry);
  if (typeof entry === "function") return entry(url);
  return entry.test(url);
}

let trailingDotWarned = false;

/**
 * Auth-aware plugin.
 *
 * Listens for player `error` events with code `"unauthorized"` and invokes
 * the `onUnauthorized` callback. Optionally pauses playback.
 *
 * For `withCredentials` URL matching, the source URL is checked against
 * `allowlist` on source load — delegates to the HLS loader's
 * `hls:setWithCredentials` command if available.
 *
 * Golden case: G13 (authenticated HLS stream via api-gateway).
 */
export function createAuthAwarePlugin(options: AuthAwarePluginOptions = {}): PluginInstance {
  const { allowlist = [], onUnauthorized, pauseOnUnauthorized = true } = options;

  // A12 consistency guard — warn once per page if the caller passed a
  // string entry ending with "." (a common mistake we've seen in f8-ui
  // vs f8-dash-ui where the two callsites disagreed on the trailing dot).
  for (const entry of allowlist) {
    if (
      typeof entry === "string" &&
      entry.length > 12 &&
      entry.endsWith(".") &&
      !trailingDotWarned
    ) {
      trailingDotWarned = true;
      console.warn(
        "[@f8/player-plugin-auth-aware] allowlist entry ends with '.': `" +
          entry +
          "`. String entries are treated as literal prefixes — if you want " +
          "to require the dot as a separator use a RegExp instead, e.g. " +
          "`/^" +
          entry.replace(/\./g, "\\.") +
          "\\w/`.",
      );
    }
  }

  return {
    name: PLUGIN_NAME,

    setup(player: Player, _host: PluginHost): () => void {
      // Predicate that yields `true` for any URL matching the allowlist.
      // Used both for auto-injecting `source.withCredentials` (T3.4) and for
      // the post-ready `hls:setWithCredentials` command path.
      const matchesAllowlist = (url: string): boolean =>
        allowlist.some((entry) => matches(entry, url));

      // Apply withCredentials for matching sources (post-ready legacy path).
      const applyCredentials = (): void => {
        const src = player.getSource()?.src ?? "";
        if (matchesAllowlist(src) && player.commands.has("hls:setWithCredentials")) {
          player.commands.run("hls:setWithCredentials", true);
        }
      };

      const offReady = player.on("ready", applyCredentials);

      // ─── T3.4: auto-inject `source.withCredentials` predicate ─────────
      // When the consumer provides only an allowlist (no `withCredentials`
      // on the descriptor), patch the descriptor by calling `setSource` with
      // the derived predicate. This guarantees credentials are attached to
      // the very first manifest XHR — the legacy `hls:setWithCredentials`
      // command fires post-ready (too late for the manifest).
      //
      // Guards:
      //   - Skip if `withCredentials` is already set (consumer override wins).
      //   - Skip if the URL does not match the allowlist (avoid pointless setSource).
      //   - The predicate itself is a function — after the patch, the next
      //     subscribe tick sees `withCredentials !== undefined` and exits.
      const offSourceSubscribe = allowlist.length === 0
        ? () => undefined
        : player.subscribe(
            (s) => s.source,
            (source) => {
              if (!source) return;
              if (source.withCredentials !== undefined) return;
              if (!matchesAllowlist(source.src)) return;
              player.setSource({
                ...source,
                withCredentials: matchesAllowlist,
              });
            },
          );

      const offError = player.on("error", (err) => {
        if (err.code !== "unauthorized") return;
        const src = player.getSource()?.src ?? "";
        const status: 401 | 403 = err.message?.includes("403") ? 403 : 401;
        onUnauthorized?.(src, status);
        if (pauseOnUnauthorized && player.getState().status === "playing") {
          player.pause();
        }
      });

      const offUnauthorized = player.on("unauthorized", (e) => {
        onUnauthorized?.(e.url, e.status);
        if (pauseOnUnauthorized && player.getState().status === "playing") {
          player.pause();
        }
      });

      return () => {
        offReady();
        offError();
        offUnauthorized();
        offSourceSubscribe();
      };
    },
  };
}

/** @internal — test helper to reset the one-shot warn guard. */
export function __resetTrailingDotWarnForTests(): void {
  trailingDotWarned = false;
}
