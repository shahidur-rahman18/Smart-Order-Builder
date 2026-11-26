import { formatBdt } from '../../engine/money'
import type { MenuOption } from '../../types/menu'
import { Stepper } from '../common/Stepper'

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
  if (headroom === 0) return 'Sold out'
  return `+${headroom} left`
}

export function OptionRow({ option, qty, headroom, onChange }: Props) {
  const noStock = headroom === 0
  const selected = qty > 0

  let look = 'border-line bg-white hover:border-muted/40'
  if (selected) look = 'border-primary/50 bg-selected'
  else if (noStock) look = 'border-line bg-page opacity-70' // nothing chosen, nothing left

  return (
    <li className={`min-w-0 rounded-lg border px-2 py-1 transition-colors ${look}`}>
      <div className="flex items-baseline justify-between gap-1">
        <p className="min-w-0 text-sm leading-tight font-semibold wrap-break-word text-ink lg:text-[0.78rem]">
          {option.name}
        </p>
        <span className="shrink-0 text-xs text-muted tabular-nums lg:text-[0.7rem]">
          {option.price > 0 ? `+${formatBdt(option.price)}` : 'Free'}
        </span>
      </div>
      <div className="mt-0.5 flex flex-wrap items-center justify-between gap-1">
        <span
          className={`rounded-full px-1.5 py-0.5 text-xs leading-none font-medium whitespace-nowrap lg:text-[0.65rem] ${noStock ? 'bg-red-50 text-red-700' : 'bg-page text-muted'}`}
        >
          {stockLabel(headroom)}
        </span>
        <Stepper
          value={qty}
          label={option.name}
          valueLabel={`${option.name} quantity`}
          onChange={onChange}
          compact
          minusDisabledReason={qty === 0 ? 'Nothing to remove' : undefined}
          plusDisabledReason={noStock ? `Not enough stock for another ${option.name}` : undefined}
        />
      </div>
    </li>
  )
}
