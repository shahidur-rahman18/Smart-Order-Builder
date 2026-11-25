import { useRef, useState } from 'react'
import { api } from '../api/client'
import type { ItemBody } from '../types/api'
import type { Config } from '../types/menu'
import { toFailure, useDraftKey, type RequestFailure } from './useDraftKey'

export type AddStatus = 'idle' | 'pending' | 'added' | 'failed'

export interface AddToCart {
  status: AddStatus
  failure: RequestFailure | null
  add: (config: Config, quantity: number) => void
  clearMessage: () => void // the user changed the draft: old success/error text no longer fits
}

// POST /api/cart/items with one idempotency key per draft (see useDraftKey).
// onFailed lets the caller refresh stock, e.g. after OUT_OF_STOCK.
export function useAddToCart(onAdded: (body: ItemBody) => void, onFailed?: () => void): AddToCart {
  const [status, setStatus] = useState<AddStatus>('idle')
  const [failure, setFailure] = useState<RequestFailure | null>(null)
  const draftKey = useDraftKey()
  // A ref, not state: three fast clicks can arrive before React re-renders the
  // disabled button, but the ref is already true after the first one.
  const pendingRef = useRef(false)

  function add(config: Config, quantity: number): void {
    if (pendingRef.current) return
    pendingRef.current = true
    const idempotencyKey = draftKey.keyFor(JSON.stringify({ config, quantity }))
    setStatus('pending')
    setFailure(null)

    api
      .addItem({ idempotencyKey, config, quantity })
      .then((body) => {
        draftKey.reset()
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
