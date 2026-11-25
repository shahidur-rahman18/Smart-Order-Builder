import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import type { StoredOrder } from '../types/order'

export interface OrdersState {
  orders: StoredOrder[] | null // null until the first answer
  error: string | null
  refresh: () => void
}

// All orders (seed + checkout) from GET /api/orders. Asked fresh every time the
// Orders tab opens (the component mounts), so a new order shows up at once.
export function useOrders(): OrdersState {
  const [orders, setOrders] = useState<StoredOrder[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    api
      .getOrders()
      .then((body) => {
        setOrders(body.orders)
        setError(null)
      })
      .catch(() => setError('Could not load the orders.'))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { orders, error, refresh }
}
