import { useRef, useState } from 'react'
import { api } from '../api/client'
import type { StoredOrder } from '../types/order'
import { toFailure, useDraftKey, type RequestFailure } from './useDraftKey'

export type PayStatus = 'idle' | 'pending' | 'paid' | 'failed'

export interface Checkout {
  status: PayStatus
  failure: RequestFailure | null
  order: StoredOrder | null // the order just placed
  pay: (cartVersion: number, paymentMethod: string) => void
}

// POST /api/checkout. The key belongs to one cart version + payment method:
// a double click or a Retry sends the same key, so the server makes ONE order (TC-16, D4).
export function useCheckout(onPaid: (order: StoredOrder) => void): Checkout {
  const [status, setStatus] = useState<PayStatus>('idle')
  const [failure, setFailure] = useState<RequestFailure | null>(null)
  const [order, setOrder] = useState<StoredOrder | null>(null)
  const draftKey = useDraftKey()
  const pendingRef = useRef(false) // blocks the 2nd click before React re-renders

  function pay(cartVersion: number, paymentMethod: string): void {
    if (pendingRef.current) return
    pendingRef.current = true
    const idempotencyKey = draftKey.keyFor(JSON.stringify({ cartVersion, paymentMethod }))
    setStatus('pending')
    setFailure(null)

    api
      .checkout({ idempotencyKey, paymentMethod })
      .then((body) => {
        draftKey.reset()
        setOrder(body.order)
        setStatus('paid')
        onPaid(body.order)
      })
      .catch((err: unknown) => {
        setStatus('failed')
        setFailure(toFailure(err))
      })
      .finally(() => {
        pendingRef.current = false
      })
  }

  return { status, failure, order, pay }
}
