import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Menu } from '../types/menu'

export interface MenuState {
  menu: Menu | null
  error: string | null
  reload: () => void
}

// The whole menu (groups, options, rules, prices) comes from GET /api/menu.
export function useMenu(): MenuState {
  const [menu, setMenu] = useState<Menu | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api
      .getMenu()
      .then((body) => {
        if (cancelled) return
        setMenu(body.menu)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the menu.')
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])
  return { menu, error, reload }
}
