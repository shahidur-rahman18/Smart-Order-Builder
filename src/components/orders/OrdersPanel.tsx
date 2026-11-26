import { formatBdt } from '../../engine/money'
import { useOrders } from '../../hooks/useOrders'
import type { Menu } from '../../types/menu'
import type { StoredOrder } from '../../types/order'
import { DownloadOrdersButton } from './DownloadOrdersButton'
import { btnDanger } from '../ui'

interface Props {
  menu: Menu
}

// Order time in the shop's time zone (from the menu), e.g. "25 Nov 2026, 10:59".
function shopTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleString('en-GB', { timeZone, dateStyle: 'medium', timeStyle: 'short' })
}

function itemCount(order: StoredOrder): number {
  return order.lines.reduce((sum, line) => sum + line.quantity, 0)
}

function couponText(order: StoredOrder): string {
  if (order.coupon.entered === null) return '—'
  return order.coupon.applied ? `${order.coupon.entered} (applied)` : `${order.coupon.entered} (not applied)`
}

export function OrdersPanel({ menu }: Props) {
  const { orders, error, refresh } = useOrders()
  // Newest first; the stored list itself keeps its own order.
  const newestFirst = orders ? [...orders].reverse() : []

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Orders{orders ? ` (${orders.length})` : ''}
        </h2>
        <DownloadOrdersButton />
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" className={btnDanger} onClick={refresh}>
            Try again
          </button>
        </div>
      )}
      {orders === null && !error && <p className="text-sm text-muted">Loading orders…</p>}

      {orders !== null && (
        // Scrolls sideways on a narrow phone instead of squeezing the columns.
        <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-sm">
          <table aria-label="Orders" className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-page text-xs tracking-wide text-muted uppercase">
              <tr>
                <th className="px-3 py-2 font-medium">Order</th>
                <th className="px-3 py-2 font-medium">Time ({menu.shop.timeZone})</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Items</th>
                <th className="px-3 py-2 font-medium">Payment</th>
                <th className="px-3 py-2 font-medium">Coupon</th>
                <th className="px-3 py-2 text-right font-medium">Payable</th>
              </tr>
            </thead>
            <tbody>
              {newestFirst.map((order) => (
                <tr key={order.id} className="border-t border-line hover:bg-selected">
                  <td className="px-3 py-2 font-mono text-xs text-muted">{order.id}</td>
                  <td className="px-3 py-2">{shopTime(order.createdAt, menu.shop.timeZone)}</td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-page px-2 py-0.5 text-xs font-medium text-muted">
                      {order.source}
                    </span>
                  </td>
                  <td className="px-3 py-2">{itemCount(order)}</td>
                  <td className="px-3 py-2">{order.paymentMethod}</td>
                  <td className="px-3 py-2">{couponText(order)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">BDT {formatBdt(order.totals.payable)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
