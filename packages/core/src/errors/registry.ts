/**
 * `PlayerError` factory + (optional) `Error` subclass for stack traces.
 *
 * The state machine and the source providers emit plain `PlayerError`
 * objects so the bus payload stays serializable. `createPlayerError`
 * provides one place to normalize the shape.
 */

import { type PlayerError, type PlayerErrorCode } from "../types/error.js";

export interface CreatePlayerErrorInput {
  code: PlayerErrorCode;
  message: string;
  cause?: unknown;
  status?: number;
  url?: string;
  retryable?: boolean;
}

const RETRYABLE_BY_DEFAULT: Record<PlayerErrorCode, boolean> = {
  source: false,
  network: true,
  decode: false,
  unauthorized: false,
  unsupported: false,
  internal: false,
};

/**
 * Build a `PlayerError`. `retryable` defaults to a conservative per-code
 * value; callers can always override.
 */
export function createPlayerError(input: CreatePlayerErrorInput): PlayerError {
  const error: PlayerError = {
    code: input.code,
    message: input.message,
    retryable: input.retryable ?? RETRYABLE_BY_DEFAULT[input.code],
  };
  if (input.cause !== undefined) error.cause = input.cause;
  if (input.status !== undefined) error.status = input.status;
  if (input.url !== undefined) error.url = input.url;
  return error;
}
