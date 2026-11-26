import { useEffect, useState } from 'react'
import { serverNow } from '../api/serverClock'

// Shows the server's time (not the browser's), so it matches the countdowns.
export function ServerClock({ timeZone }: { timeZone: string }) {
  const [now, setNow] = useState(() => serverNow())
  useEffect(() => {
    const timer = setInterval(() => setNow(serverNow()), 1000)
    return () => clearInterval(timer)
  }, [])

  const time = new Intl.DateTimeFormat('en-GB', { timeZone, hour12: false, timeStyle: 'medium' }).format(now)
  return (
    <span className="hidden items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs text-muted md:inline-flex">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
      Server time <b className="tabular-nums text-ink">{time}</b> · {timeZone}
    </span>
  )
}
