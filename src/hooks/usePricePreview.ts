import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api/client'
import type { PriceBody } from '../types/api'
import type { Config } from '../types/menu'
import { useDebouncedValue } from './useDebouncedValue'

const DEBOUNCE_MS = 300

export type PreviewStatus = 'loading' | 'ready' | 'error'

export interface PricePreview {
  status: PreviewStatus
  body: PriceBody | null // last good answer (old while loading); null after an error
  error: string | null
  retry: () => void
}

interface Draft {
  config: Config
  quantity: number
}

// What the last finished request said, and for which draft + attempt it was.
interface Result {
  draft: Draft | null
  attempt: number
  body: PriceBody | null
  error: string | null
}

// Server price for the draft, asked 300 ms after the last change (TC-12).
export function usePricePreview(config: Config, quantity: number): PricePreview {
  const draft = useMemo<Draft>(() => ({ config, quantity }), [config, quantity])
  const debounced = useDebouncedValue(draft, DEBOUNCE_MS)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<Result>({ draft: null, attempt: 0, body: null, error: null })
  const latestId = useRef(0)

  useEffect(() => {
    // Two guards against an old answer overwriting a newer one:
    // 1) abort the previous request, 2) ignore any answer whose requestId is not the latest.
    latestId.current += 1
    const requestId = String(latestId.current)
    const controller = new AbortController()

    api
      .price({ requestId, config: debounced.config, quantity: debounced.quantity }, controller.signal)
      .then((body) => {
        if (body.requestId !== String(latestId.current)) return
        setResult({ draft: debounced, attempt, body, error: null })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const error = err instanceof Error ? err.message : 'Price is not available right now.'
        // Drop the old price: it belongs to an older draft, so showing it
        // next to the error would show a price for a config the user no longer has.
        setResult({ draft: debounced, attempt, body: null, error })
      })

    return () => controller.abort()
  }, [debounced, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  // Loading = the answer on hand is not for the current draft (still typing,
  // or the request is on its way).
  const upToDate = result.draft === draft && result.attempt === attempt
  let status: PreviewStatus = 'loading'
  if (upToDate) status = result.error ? 'error' : 'ready'

  return { status, body: result.body, error: upToDate ? result.error : null, retry }
}
