import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { btnDevXs } from './ui'

const MESSAGE_MS = 5000

interface Props {
  onReset: () => void // the page starts over (cart, builder, orders)
}

// Footer buttons for the demo: show TC-14 on purpose, and start again with only the seed.
export function DevTools({ onReset }: Props) {
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // The footer cannot see when the "fail once" is used up, so a message is
  // only a short confirmation: it hides itself instead of going out of date.
  useEffect(() => {
    if (message === null) return
    const timer = setTimeout(() => setMessage(null), MESSAGE_MS)
    return () => clearTimeout(timer)
  }, [message])

  function run(action: () => Promise<unknown>, done: string, after?: () => void): void {
    setPending(true)
    action()
      .then(() => {
        setMessage(done)
        after?.()
      })
      .catch(() => setMessage('That did not work. Try again.'))
      .finally(() => setPending(false))
  }

  const reason = pending ? 'Working…' : undefined
  const buttonClass = btnDevXs

  return (
    <footer className="shrink-0 border-t border-line bg-white">
      <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-2 px-4 py-1.5 text-xs sm:px-6">
        <span className="font-semibold tracking-wide text-muted uppercase">Dev tools</span>
        <button
          type="button"
          className={buttonClass}
          disabled={pending}
          title={reason}
          onClick={() => run(api.devFailNextReserve, 'The next reserve will fail once.')}
        >
          Fail next reserve
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={pending}
          title={reason}
          onClick={() => run(api.devReset, 'Demo data reset: only the seed orders are left.', onReset)}
        >
          Reset demo data
        </button>
        {message && (
          <span role="status" className="text-muted">
            {message}
          </span>
        )}
      </div>
    </footer>
  )
}
