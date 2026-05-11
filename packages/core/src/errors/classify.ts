/**
 * Map low-level failures (`MediaError`, HTTP `XMLHttpRequest.status`, raw
 * `Error`) to a stable `PlayerError`.
 */

import { type PlayerError } from "../types/error.js";

import { createPlayerError } from "./registry.js";

/**
 * `MediaError.code` constants (stable across browsers).
 *
 * - 1: MEDIA_ERR_ABORTED
 * - 2: MEDIA_ERR_NETWORK
 * - 3: MEDIA_ERR_DECODE
 * - 4: MEDIA_ERR_SRC_NOT_SUPPORTED
 */
export function classifyMediaError(err: MediaError | null | undefined, url?: string): PlayerError {
  const code = err?.code ?? 0;
  const message = err?.message || "Media error";
  switch (code) {
    case 1:
      return createPlayerError({ code: "internal", message: "Media playback aborted", url });
    case 2:
      return createPlayerError({ code: "network", message, url, retryable: true });
    case 3:
      return createPlayerError({ code: "decode", message, url });
    case 4:
      return createPlayerError({ code: "unsupported", message, url });
    default:
      return createPlayerError({ code: "internal", message, url, cause: err });
  }
}

/**
 * Map an HTTP status to a `PlayerError`. Used by the HLS provider when
 * `xhrSetup` sees a 4xx/5xx.
 */
export function classifyHttpStatus(status: number, url: string): PlayerError {
  if (status === 401 || status === 403) {
    return createPlayerError({
      code: "unauthorized",
      message: status === 401 ? "Unauthorized" : "Forbidden",
      status,
      url,
    });
  }
  if (status >= 500 && status < 600) {
    return createPlayerError({
      code: "network",
      message: `Server error ${status}`,
      status,
      url,
      retryable: true,
    });
  }
  if (status >= 400 && status < 500) {
    return createPlayerError({
      code: "network",
      message: `Client error ${status}`,
      status,
      url,
      retryable: false,
    });
  }
  return createPlayerError({
    code: "network",
    message: `HTTP ${status}`,
    status,
    url,
  });
}

/**
 * Catch-all classifier for arbitrary `Error` objects. Defaults to the
 * `internal` code with the original error attached as `cause`.
 */
export function classifyUnknown(err: unknown, url?: string): PlayerError {
  if (err instanceof Error) {
    return createPlayerError({
      code: "internal",
      message: err.message || "Unknown error",
      cause: err,
      url,
    });
  }
  return createPlayerError({
    code: "internal",
    message: typeof err === "string" ? err : "Unknown error",
    cause: err,
    url,
  });
}
