import { useRef, useState } from 'react'
import { ApiError, api } from '../api/client'
import type { ItemBody } from '../types/api'
import type { Config, Shortage } from '../types/menu'

export type AddStatus = 'idle' | 'pending' | 'added' | 'failed'

export interface AddFailure {
  message: string
  canRetry: boolean // 503 / network: the same request may work a moment later
  shortages: Shortage[]
}

export interface AddToCart {
  status: AddStatus
  failure: AddFailure | null
  add: (config: Config, quantity: number) => void
  clearMessage: () => void // the user changed the draft: old success/error text no longer fits
}

// The idempotency key belongs to one draft (config + quantity).
// Same draft → same key, even on a double click or a Retry, so the server
// creates at most one item (TC-13, TC-14). A new key only after success or
// when the draft changes.
// onFailed lets the caller refresh stock, e.g. after OUT_OF_STOCK.
export function useAddToCart(onAdded: (body: ItemBody) => void, onFailed?: () => void): AddToCart {
  const [status, setStatus] = useState<AddStatus>('idle')
  const [failure, setFailure] = useState<AddFailure | null>(null)
  const keyRef = useRef<{ draft: string; key: string } | null>(null)
  // A ref, not state: three fast clicks can arrive before React re-renders the
  // disabled button, but the ref is already true after the first one.
  const pendingRef = useRef(false)

  function keyFor(draft: string): string {
    if (keyRef.current?.draft !== draft) keyRef.current = { draft, key: crypto.randomUUID() }
    return keyRef.current.key
  }

  function add(config: Config, quantity: number): void {
    if (pendingRef.current) return
    pendingRef.current = true
    const idempotencyKey = keyFor(JSON.stringify({ config, quantity }))
    setStatus('pending')
    setFailure(null)

    api
      .addItem({ idempotencyKey, config, quantity })
      .then((body) => {
        keyRef.current = null
        setStatus('added')
        onAdded(body)
      })
      .catch((err: unknown) => {
        setStatus('failed')
        setFailure(toFailure(err))
        onFailed?.()
      })
      .finally(() => {
        pendingRef.current = false
      })
  }

  function clearMessage(): void {
    if (pendingRef.current) return
    setStatus('idle')
    setFailure(null)
  }

  return { status, failure, add, clearMessage }
}

function toFailure(err: unknown): AddFailure {
  if (!(err instanceof ApiError)) return { message: 'Something went wrong.', canRetry: true, shortages: [] }
  const canRetry = err.status === 0 || err.status === 503
  const message = err.status === 503 ? 'Could not reserve. Your selection is kept.' : err.message
  return { message, canRetry, shortages: err.body?.shortages ?? [] }
}
