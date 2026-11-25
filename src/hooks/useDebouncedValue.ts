import { useEffect, useState } from 'react'

// Gives back `value`, but only after it has stopped changing for `delayMs`.
// Every new value restarts the wait, so fast clicks send one request, not ten.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
