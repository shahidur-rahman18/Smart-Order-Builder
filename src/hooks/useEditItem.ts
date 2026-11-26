import { useRef, useState } from 'react'
import { ApiError, api } from '../api/client'
import type { ItemBody } from '../types/api'
import type { CartItemView } from '../types/cart'
import type { Config } from '../types/menu'
import { isConflict, toFailure, useDraftKey, type RequestFailure } from './useDraftKey'

export type SaveStatus = 'idle' | 'pending' | 'failed'

export interface EditItem {
  status: SaveStatus
  failure: RequestFailure | null
  expired: boolean // the server said 410 EXPIRED: this item can no longer be saved (D3)
  conflict: boolean // 409 VERSION_CONFLICT: another tab changed this item first (Part G)
  save: (config: Config, quantity: number) => void
  clearMessage: () => void
}

// PUT /api/cart/items/:id — the whole edit is one atomic server call.
// item is null when the builder is not editing; then save does nothing.
export function useEditItem(
  item: CartItemView | null,
  onSaved: (body: ItemBody) => void,
  onFailed?: () => void,
): EditItem {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [failure, setFailure] = useState<RequestFailure | null>(null)
  const [expired, setExpired] = useState(false)
  const [conflict, setConflict] = useState(false)
  const draftKey = useDraftKey()
  const pendingRef = useRef(false) // blocks a double click before React re-renders

  function save(config: Config, quantity: number): void {
    if (item === null || pendingRef.current) return
    pendingRef.current = true
    const idempotencyKey = draftKey.keyFor(JSON.stringify({ config, quantity }))
    setStatus('pending')
    setFailure(null)

    api
      .editItem(item.id, { idempotencyKey, config, quantity, itemVersion: item.version })
      .then((body) => {
        draftKey.reset()
        setStatus('idle')
        onSaved(body)
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.code === 'EXPIRED') {
          // Not an error to retry: the builder switches to "Add as new item" (D3).
          setExpired(true)
          setStatus('idle')
        } else if (isConflict(err)) {
          // Saving again would overwrite the other tab's change: the edit must start over.
          setConflict(true)
          setStatus('idle')
        } else {
          setStatus('failed')
          setFailure(toFailure(err))
        }
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

  return { status, failure, expired, conflict, save, clearMessage }
}
