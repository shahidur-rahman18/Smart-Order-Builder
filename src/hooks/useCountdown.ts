import { useEffect, useState } from 'react'
import { serverNow } from '../api/serverClock'

const TICK_MS = 1000

// Milliseconds left until `expiresAt` (server time), never below 0.
// Uses serverNow(), not Date.now(): the server runs 90 s ahead, so the
// browser's own clock would show 90 s too many (TC-15).
// null = nothing to count (e.g. the builder is not editing): no timer runs.
export function useCountdown(expiresAt: number): number
export function useCountdown(expiresAt: number | null): number | null
export function useCountdown(expiresAt: number | null): number | null {
  const [now, setNow] = useState(() => serverNow())
  const counting = expiresAt !== null

  useEffect(() => {
    if (!counting) return
    const timer = setInterval(() => setNow(serverNow()), TICK_MS)
    return () => clearInterval(timer)
  }, [counting])

  return expiresAt === null ? null : Math.max(0, expiresAt - now)
}

// 299_500 ms → "5:00". Rounds up, so "0:00" only appears when time is really over.
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}
