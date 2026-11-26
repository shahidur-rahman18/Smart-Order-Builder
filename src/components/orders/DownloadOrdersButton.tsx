import { useState } from 'react'
import { api } from '../../api/client'
import { ordersToJson } from '../../engine/ordersJson'
import { btnPrimary } from '../ui'

// Asks the server for the latest orders at click time, then saves them as a file.
export function DownloadOrdersButton() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function download(): void {
    setPending(true)
    setError(null)
    api
      .getOrders()
      .then(({ orders }) => {
        const blob = new Blob([ordersToJson(orders)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'orders.json'
        link.click()
        URL.revokeObjectURL(url)
      })
      .catch(() => setError('Could not load the orders. Try again.'))
      .finally(() => setPending(false))
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={btnPrimary}
        disabled={pending}
        title={pending ? 'Preparing the file…' : undefined}
        onClick={download}
      >
        Download orders.json
      </button>
      {error && (
        <span role="alert" className="text-sm text-red-700">
          {error}
        </span>
      )}
    </div>
  )
}
