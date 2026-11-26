import { useEffect } from 'react'
import { formatBdt } from '../../engine/money'
import { useCountdown } from '../../hooks/useCountdown'
import type { CartItemView } from '../../types/cart'
import type { Menu } from '../../types/menu'
import { Countdown } from './Countdown'
import { btnSecondarySm } from '../ui'

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

// "Toast ×1, Scrambled ×2" in menu order; names come from the menu, not from code.
function describeConfig(item: CartItemView, menu: Menu): string {
  const parts: string[] = []
  for (const group of menu.groups) {
    for (const option of group.options) {
      const qty = item.config[option.id]
      if (qty) parts.push(`${option.name} ×${qty}`)
    }
  }
  return parts.join(', ')
}

// Per-item deals (already inside lineTotal), so the user sees why the price is lower.
function UnitDiscounts({ item }: { item: CartItemView }) {
  const { cheapestFree, combo } = item.unit
  if (cheapestFree.discount === 0 && combo.discount === 0) return null
  return (
    <p className="mt-1 text-xs font-medium text-emerald-700">
      {cheapestFree.discount > 0 && `${cheapestFree.freeUnits} extra free: − BDT ${formatBdt(cheapestFree.discount)} each item. `}
      {combo.discount > 0 && `Combo: − BDT ${formatBdt(combo.discount)} each item.`}
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

  return (
    <li
      aria-label={`Cart item ${position}`}
      className={`rounded-xl border p-3 ${expired ? 'border-dashed border-line bg-page text-muted' : 'border-line bg-white'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm">
          <span className="font-medium">{item.quantity} × </span>
          {describeConfig(item, menu)}
        </p>
        <p className="shrink-0 text-sm font-semibold tabular-nums">BDT {formatBdt(item.lineTotal)}</p>
      </div>

      <UnitDiscounts item={item} />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        {expired ? (
          <span className="text-xs font-medium">Reservation expired — remove or add again</span>
        ) : (
          <Countdown msLeft={msLeft} />
        )}
        <div className="flex gap-2">
          {/* An expired item holds no stock and cannot be saved: Remove only. */}
          {!expired && (
            <button
              type="button"
              className={btnSecondarySm}
              disabled={editing}
              title={editing ? 'Open in the builder' : undefined}
              onClick={onEdit}
            >
              Edit
            </button>
          )}
          <button
            type="button"
            className={btnSecondarySm}
            disabled={removing}
            title={removing ? 'Removing…' : undefined}
            onClick={onRemove}
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  )
}
