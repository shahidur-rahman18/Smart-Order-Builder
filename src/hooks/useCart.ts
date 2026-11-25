import { useCallback, useEffect, useState } from 'react'
import { ApiError, api } from '../api/client'
import type { CartView } from '../types/cart'
import type { CartBreakdown } from '../types/pricing'

const REFRESH_EVERY_MS = 5000

export interface CartState {
  cart: CartView | null // null until the first answer
  totals: CartBreakdown | null
  error: string | null
  removingId: string | null // the item whose Remove is in flight
  couponPending: boolean
  refresh: () => void
  remove: (itemId: string) => void
  setCoupon: (code: string | null) => void
}

// The cart lives on the server and is shared by every tab (localStorage).
// So we ask again every 5 s, on window focus, and after our own changes.
export function useCart(): CartState {
  const [cart, setCart] = useState<CartView | null>(null)
  const [totals, setTotals] = useState<CartBreakdown | null>(null)
  const [error, setError] = useState<string | null>(null)
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
    (itemId: string) => {
      setRemovingId(itemId)
      api
        .removeItem(itemId)
        .then(() => setError(null))
        .catch((err: unknown) => {
          // 404 = another tab already removed it; the refresh below shows the truth.
          if (!(err instanceof ApiError && err.status === 404)) setError('Could not remove the item.')
        })
        .finally(() => {
          setRemovingId(null)
          refresh() // totals come only with GET /api/cart
        })
    },
    [refresh],
  )

  // The server stores what was typed; priceCart decides if it applies (and says why not).
  const setCoupon = useCallback((code: string | null) => {
    setCouponPending(true)
    api
      .setCoupon(code)
      .then((body) => {
        setCart(body.cart)
        setTotals(body.totals)
        setError(null)
      })
      .catch(() => setError('Could not save the coupon.'))
      .finally(() => setCouponPending(false))
  }, [])

  return { cart, totals, error, removingId, couponPending, refresh, remove, setCoupon }
}
