import { useState } from 'react'
import { api } from '../api/client'

interface Props {
  onReset: () => void // the page starts over (cart, builder, orders)
}

// Footer buttons for the demo: show TC-14 on purpose, and start again with only the seed.
export function DevTools({ onReset }: Props) {
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

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
  const buttonClass = 'rounded border border-slate-300 bg-white px-3 py-1 disabled:opacity-50'

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 text-sm">
        <span className="font-medium text-slate-500">Dev tools</span>
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
          <span role="status" className="text-slate-600">
            {message}
          </span>
        )}
      </div>
    </footer>
  )
}
