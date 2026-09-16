import { RpcError, StatusCode } from 'grpc-web'

/** Thrown instead of a normal Error when an RPC fails because the session is no
 *  longer valid - callers should redirect to login rather than toast this. */
export class AuthRequiredError extends Error {}

/** User-facing copy for a failed action - never the raw server message, which can
 *  carry internal detail (stack frames, SQL, backend service names) that isn't
 *  meant to reach the end user. The real message is still logged to the console
 *  via toErrorMessage/normalizeAndDispatch for debugging. */
export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.'

export type ToastSeverity = 'error' | 'warn' | 'restricted'

// grpc-gateway's canonical code->HTTP mapping puts these at 5xx.
const SERVER_ERROR_CODES: ReadonlySet<StatusCode> = new Set([
  StatusCode.UNKNOWN,
  StatusCode.INTERNAL,
  StatusCode.DATA_LOSS,
  StatusCode.UNIMPLEMENTED,
  StatusCode.DEADLINE_EXCEEDED,
  StatusCode.UNAVAILABLE,
])

/** Classifies a caught error for toast styling. NOT_FOUND reads as 'restricted' -
 *  this app returns it for both "doesn't exist" and "you don't have access", so a
 *  locked-down icon fits better than a literal not-found one. A 5xx-equivalent
 *  status, or anything that isn't a recognized RpcError at all (e.g. a network
 *  failure), reads as 'warn'. Everything else (validation-shaped codes) is a plain
 *  'error'. */
export function errorSeverity(err: unknown): ToastSeverity {
  if (err instanceof RpcError) {
    if (err.code === StatusCode.NOT_FOUND) return 'restricted'
    return SERVER_ERROR_CODES.has(err.code) ? 'warn' : 'error'
  }
  return 'warn'
}

// Oathkeeper's own rejection body (oathkeeper.yml's `errors.handlers.json`, verbose:true)
// is a short generic JSON blob - it never carries a downstream service's error text, since
// a session-gate rejection happens before the request reaches any backend. Anything past
// this length already made it through the gate and failed for an unrelated reason (e.g. a
// backend it calls being unreachable), so treating it as a dead session would be wrong.
const GATEWAY_REJECTION_MAX_LENGTH = 200

export function isAuthError(err: unknown): boolean {
  if (!(err instanceof RpcError)) return false
  if (err.code === StatusCode.UNAUTHENTICATED || err.code === StatusCode.PERMISSION_DENIED) {
    return true
  }

  // Oathkeeper rejects a cookie_session-gated route with a plain 401 before the request
  // ever reaches the gRPC backend - that response isn't grpc-web-framed, so grpc-web can't
  // parse a StatusCode out of it and leaves `code` unset instead of UNAUTHENTICATED. Every
  // call in this app goes through that same gateway (see manufacturer/client.ts's BASE_URL
  // comment), so an unset code is normally the signal that the session died - unless the
  // message is long enough to be a real backend error that also came back unframed.
  return err.code == null && err.message.length <= GATEWAY_REJECTION_MAX_LENGTH
}

/** Logs a caught RPC error under `logPrefix` and returns its display message,
 *  without throwing - for callers that report failures via callback rather than a
 *  rejected promise (chat/client.ts's streamChat).
 *
 *  The full message (which can carry a backend's internal detail - service hostnames,
 *  dependency names, wrapped Go error chains) only goes to the console in dev. In a
 *  production build it's still someone's browser console, not a developer's, so only the
 *  status code is logged there - the same GENERIC_ERROR_MESSAGE-shaped copy is still what
 *  gets displayed either way. */
export function toErrorMessage(err: unknown, context: string, logPrefix: string): string {
  if (err instanceof RpcError) {
    if (import.meta.env.DEV) {
      console.error(`${logPrefix}: ${context}`, StatusCode[err.code], err.message)
    } else {
      console.error(`${logPrefix}: ${context}`, StatusCode[err.code])
    }
    return err.message
  }
  console.error(`${logPrefix}: ${context}`, import.meta.env.DEV ? err : undefined)
  return err instanceof Error ? err.message : String(err)
}

/** Shared catch-block body for the grpc-web API clients: logs, then throws
 *  AuthRequiredError for an expired/invalid session, or rethrows the original error
 *  otherwise - preserving the RpcError instance (not just its message) so callers
 *  further up, like errorSeverity, can still read its status code. */
export function normalizeAndDispatch(err: unknown, context: string, logPrefix: string): never {
  const message = toErrorMessage(err, context, logPrefix)
  if (isAuthError(err)) throw new AuthRequiredError(message)
  if (err instanceof RpcError) throw err
  throw err instanceof Error ? err : new Error(message)
}
