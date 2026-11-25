import { useRef } from 'react'
import { ApiError } from '../api/client'
import type { Shortage } from '../types/menu'

export interface DraftKey {
  keyFor: (draft: string) => string
  reset: () => void // after success: the next request is a new one
}

// One idempotency key per draft (config + quantity as JSON).
// Same draft → same key, even on a double click or a Retry, so the server
// does the work at most once (TC-13, TC-14). A changed draft gets a new key.
export function useDraftKey(): DraftKey {
  const keyRef = useRef<{ draft: string; key: string } | null>(null)

  function keyFor(draft: string): string {
    if (keyRef.current?.draft !== draft) keyRef.current = { draft, key: crypto.randomUUID() }
    return keyRef.current.key
  }

  function reset(): void {
    keyRef.current = null
  }

  return { keyFor, reset }
}

export interface RequestFailure {
  message: string
  canRetry: boolean // 503 / network: the same request may work a moment later
  shortages: Shortage[]
}

// What to show for a failed add or edit.
export function toFailure(err: unknown): RequestFailure {
  if (!(err instanceof ApiError)) return { message: 'Something went wrong.', canRetry: true, shortages: [] }
  const canRetry = err.status === 0 || err.status === 503
  const message = err.status === 503 ? 'Could not reserve. Your selection is kept.' : err.message
  return { message, canRetry, shortages: err.body?.shortages ?? [] }
}
