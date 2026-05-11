/**
 * Player error contract. Surfaced through the `error` event and `state.error`.
 *
 * Golden cases: G13 (unauthorized HLS), every error path in G1..G16.
 */

/** Stable error codes. The string literal IS the public contract. */
export type PlayerErrorCode =
  | "source"
  | "network"
  | "decode"
  | "unauthorized"
  | "unsupported"
  | "internal";

/**
 * Structured player error. Adapters render the message; plugins can inspect
 * `code`, `status`, and `retryable` to decide on retry/UI strategy.
 */
export interface PlayerError {
  /** Stable code. */
  code: PlayerErrorCode;
  /** Human-readable message. Adapters MAY localize. */
  message: string;
  /** Optional underlying cause (`Error`, `MediaError`, `Hls.errors.*`). */
  cause?: unknown;
  /** HTTP status, when the error came from an XHR (G13). */
  status?: number;
  /** Failing URL, when known. */
  url?: string;
  /** Whether the consumer can usefully retry (e.g. transient network). */
  retryable: boolean;
}
