import { useCallback, useEffect, useState } from 'react'
import { ApiError, api } from '../api/client'
import type { CartItemView, CartView } from '../types/cart'
import type { CartBreakdown } from '../types/pricing'
import { CONFLICT_MESSAGE, isConflict } from './useDraftKey'

const REFRESH_EVERY_MS = 5000

export interface CartState {
  cart: CartView | null // null until the first answer
  totals: CartBreakdown | null
  error: string | null
  conflict: string | null // another tab changed the cart first; kept until our next change (Part G)
  removingId: string | null // the item whose Remove is in flight
  couponPending: boolean
  refresh: () => void
  remove: (item: CartItemView) => void
  setCoupon: (code: string | null) => void
}

// The cart lives on the server and is shared by every tab (localStorage).
// So we ask again every 5 s, on window focus, and after our own changes.
export function useCart(): CartState {
  const [cart, setCart] = useState<CartView | null>(null)
  const [totals, setTotals] = useState<CartBreakdown | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [couponPending, setCouponPending] = useState(false)

  const refresh = useCallback(() => {
    api
      .getCart()
      .then((body) => {
        setCart(body.cart)
        setTotals(body.totals)
        setError(null)
      })
      .catch(() => setError('Could not load the cart.'))
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, REFRESH_EVERY_MS)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [refresh])

  const remove = useCallback(
    (item: CartItemView) => {
      setRemovingId(item.id)
      setConflict(null)
      api
        .removeItem(item.id, item.version)
        .then(() => setError(null))
        .catch((err: unknown) => {
          // 404 = another tab already removed it; the refresh below shows the truth.
          if (isConflict(err)) setConflict(CONFLICT_MESSAGE)
          else if (!(err instanceof ApiError && err.status === 404)) setError('Could not remove the item.')
        })
        .finally(() => {
          setRemovingId(null)
          refresh() // totals come only with GET /api/cart
        })
    },
    [refresh],
  )

  // The server stores what was typed; priceCart decides if it applies (and says why not).
  // It sends the version this tab is showing (Part G).
  const cartVersion = cart?.version
  const setCoupon = useCallback(
    (code: string | null) => {
      if (cartVersion === undefined) return // the cart has not loaded yet
      setCouponPending(true)
      setConflict(null)
      api
        .setCoupon(code, cartVersion)
        .then((body) => {
          setCart(body.cart)
          setTotals(body.totals)
          setError(null)
        })
        .catch((err: unknown) => {
          // The refresh clears `error`, so the conflict has its own field.
          if (isConflict(err)) {
            setConflict(CONFLICT_MESSAGE)
            refresh()
          } else setError('Could not save the coupon.')
        })
        .finally(() => setCouponPending(false))
    },
    [cartVersion, refresh],
  )

  return { cart, totals, error, conflict, removingId, couponPending, refresh, remove, setCoupon }
}
