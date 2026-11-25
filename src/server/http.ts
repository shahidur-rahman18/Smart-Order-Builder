import type { ErrorBody, ServerResponse } from '../types/api'
import { serverNow } from './clock'

// Thrown inside withState() to stop a request. Because it is thrown before the
// commit, nothing is saved. respond() turns it into an error response.
export class ServerError extends Error {
  readonly status: number
  readonly details: Omit<ErrorBody, 'serverTime'>

  constructor(status: number, details: Omit<ErrorBody, 'serverTime'>) {
    super(details.message)
    this.status = status
    this.details = details
  }
}

// Runs one request. A ServerError becomes { status, body }; any other error is a bug and is rethrown.
export function respond<Body>(work: () => ServerResponse<Body>): ServerResponse<Body | ErrorBody> {
  try {
    return work()
  } catch (error) {
    if (!(error instanceof ServerError)) throw error
    return { status: error.status, body: { ...error.details, serverTime: serverNow() } }
  }
}

export function isErrorBody(body: unknown): body is ErrorBody {
  return typeof body === 'object' && body !== null && 'code' in body && 'message' in body
}
