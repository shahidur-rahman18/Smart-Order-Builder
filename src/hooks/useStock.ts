import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import type { IngredientId } from '../types/menu'

const REFRESH_EVERY_MS = 5000

export interface StockState {
  available: Record<IngredientId, number> | null // null until the first answer
  refresh: () => void
}

// Available stock from the server. Another tab can take stock at any time,
// so we ask again every 5 s, when the window gets focus, and after our own changes.
export function useStock(): StockState {
  const [available, setAvailable] = useState<Record<IngredientId, number> | null>(null)

  const refresh = useCallback(() => {
    api
      .getStock()
      .then((body) => setAvailable(body.available))
      .catch(() => {
        // Keep the last numbers; the next refresh will try again.
      })
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

  return { available, refresh }
}
