import { formatBdt } from '../../engine/money'
import type { MenuOption } from '../../types/menu'

interface Props {
  option: MenuOption
  qty: number
  // How many more can be added (stock only). null = stock not loaded yet.
  headroom: number | 'unlimited' | null
  onChange: (qty: number) => void
}

function stockLabel(headroom: Props['headroom']): string {
  if (headroom === null) return '…'
  if (headroom === 'unlimited') return '∞'
  if (headroom === 0) return 'Out of stock'
  return `+${headroom} left`
}

export function OptionRow({ option, qty, headroom, onChange }: Props) {
  const noStock = headroom === 0
  const plusReason = noStock ? `Not enough stock for another ${option.name}` : undefined
  const minusReason = qty === 0 ? 'Nothing to remove' : undefined

  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="font-medium">{option.name}</p>
        <p className="text-sm text-slate-500">
          {option.price > 0 ? `+ BDT ${formatBdt(option.price)}` : 'Free'}
          {' · '}
          <span className={noStock ? 'text-red-600' : undefined}>{stockLabel(headroom)}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className="h-9 w-9 rounded border border-slate-300 bg-white text-lg disabled:opacity-40"
          aria-label={`Remove one ${option.name}`}
          title={minusReason}
          disabled={qty === 0}
          onClick={() => onChange(qty - 1)}
        >
          −
        </button>
        <output className="w-6 text-center tabular-nums" aria-label={`${option.name} quantity`}>
          {qty}
        </output>
        <button
          type="button"
          className="h-9 w-9 rounded border border-slate-300 bg-white text-lg disabled:opacity-40"
          aria-label={`Add one ${option.name}`}
          title={plusReason}
          disabled={noStock}
          onClick={() => onChange(qty + 1)}
        >
          +
        </button>
      </div>
    </li>
  )
}
