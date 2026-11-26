import { useEffect } from 'react'
import { formatBdt } from '../../engine/money'
import { useCountdown } from '../../hooks/useCountdown'
import type { CartItemView } from '../../types/cart'
import type { Menu } from '../../types/menu'
import { Countdown, SOON_MS } from './Countdown'
import { btnLinkDanger, btnSecondaryXs } from '../ui'

interface Props {
  item: CartItemView
  position: number // 1, 2, 3… for the accessible name
  menu: Menu
  removing: boolean
  editing: boolean // this item is open in the builder right now
  onEdit: () => void
  onRemove: () => void
  onExpired: () => void // ask the server again: it decides, and it frees the stock
}

// "Toast · Scrambled ×2" in menu order (×1 is left out to keep it short).
// Names come from the menu, not from code.
function describeConfig(item: CartItemView, menu: Menu): string {
  const parts: string[] = []
  for (const group of menu.groups) {
    for (const option of group.options) {
      const qty = item.config[option.id]
      if (qty) parts.push(qty === 1 ? option.name : `${option.name} ×${qty}`)
    }
  }
  return parts.join(' · ')
}

// Per-item deals (already inside lineTotal), so the user sees why the price is lower.
function UnitDiscounts({ item }: { item: CartItemView }) {
  const { cheapestFree, combo } = item.unit
  if (cheapestFree.discount === 0 && combo.discount === 0) return null
  return (
    <p className="mt-0.5 text-[0.7rem] font-medium text-emerald-700">
      {cheapestFree.discount > 0 && `Extras deal −${formatBdt(cheapestFree.discount)}`}
      {cheapestFree.discount > 0 && combo.discount > 0 && ' · '}
      {combo.discount > 0 && `Combo −${formatBdt(combo.discount)}`}
      {' each'}
    </p>
  )
}

export function CartItemRow({ item, position, menu, removing, editing, onEdit, onRemove, onExpired }: Props) {
  const msLeft = useCountdown(item.expiresAt)
  // Expired if the server says so, or if our server-time countdown already hit 0.
  const expired = item.status === 'expired' || msLeft === 0

  useEffect(() => {
    if (msLeft === 0 && item.status === 'active') onExpired()
  }, [msLeft, item.status, onExpired])

  const soon = !expired && msLeft < SOON_MS
  const summary = describeConfig(item, menu)

  let look = 'border-line bg-white'
  if (expired) look = 'border-dashed border-line bg-page text-muted'
  else if (soon) look = 'border-amber-300 bg-amber-50'

  return (
    <li aria-label={`Cart item ${position}`} className={`rounded-xl border px-3 py-2 ${look}`}>
      <div className="flex items-center justify-between gap-2">
        {/* One line: a long name is cut with "…", but "× qty" always stays visible. */}
        <p className="flex min-w-0 items-baseline gap-1 whitespace-nowrap text-[0.85rem] font-bold text-ink">
          <span className="truncate" title={menu.product.name}>
            {menu.product.name}
          </span>
          <span className="shrink-0">× {item.quantity}</span>
        </p>
        {expired ? (
          <span className="shrink-0 text-right text-[0.7rem] font-medium">
            Reservation expired — remove or add again
          </span>
        ) : (
          <Countdown msLeft={msLeft} />
        )}
      </div>
      {/* At most two lines; a longer list ends with "…" and shows in full on hover (title). */}
      <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted" title={summary}>
        {summary}
      </p>

      <UnitDiscounts item={item} />

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {/* An expired item holds no stock and cannot be saved: Remove only. */}
          {!expired && (
            <button
              type="button"
              className={btnSecondaryXs}
              disabled={editing}
              title={editing ? 'Open in the builder' : undefined}
              onClick={onEdit}
            >
              Edit
            </button>
          )}
          <button
            type="button"
            className={btnLinkDanger}
            disabled={removing}
            title={removing ? 'Removing…' : undefined}
            onClick={onRemove}
          >
            Remove
          </button>
        </div>
        <p className="shrink-0 text-sm font-bold text-ink tabular-nums">{formatBdt(item.lineTotal)}</p>
      </div>
    </li>
  )
}
