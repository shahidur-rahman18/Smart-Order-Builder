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

const stepButton =
  'flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white text-lg text-muted transition-colors hover:border-primary hover:bg-selected disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

export function OptionRow({ option, qty, headroom, onChange }: Props) {
  const noStock = headroom === 0
  const selected = qty > 0
  const plusReason = noStock ? `Not enough stock for another ${option.name}` : undefined
  const minusReason = qty === 0 ? 'Nothing to remove' : undefined

  return (
    <li
      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors ${selected ? 'border-primary bg-selected ring-1 ring-primary' : 'border-line bg-white hover:border-muted/40'}`}
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{option.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="font-medium text-muted">
            {option.price > 0 ? `+ BDT ${formatBdt(option.price)}` : 'Free'}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 ${noStock ? 'bg-red-50 font-medium text-red-700' : 'bg-page text-muted'}`}
          >
            {stockLabel(headroom)}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          className={stepButton}
          aria-label={`Remove one ${option.name}`}
          title={minusReason}
          disabled={qty === 0}
          onClick={() => onChange(qty - 1)}
        >
          −
        </button>
        <output
          className={`w-7 text-center tabular-nums ${selected ? 'font-bold text-primary-hover' : 'text-muted'}`}
          aria-label={`${option.name} quantity`}
        >
          {qty}
        </output>
        <button
          type="button"
          className={stepButton}
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
