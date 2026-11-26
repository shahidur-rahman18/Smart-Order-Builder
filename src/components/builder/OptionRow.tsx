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

  // Phones/tablets: name and "price · stock" on the left, a big stepper on the right.
  // Desktop (narrow columns): name + price on top, stock pill + small stepper below.
  // `lg:contents` lets the price and stock spans become grid cells on desktop.
  return (
    <li
      className={`grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-xl border px-3 py-2 transition-colors lg:gap-x-1 lg:gap-y-0.5 lg:rounded-lg lg:px-2 lg:py-1 ${look}`}
    >
      <p className="min-w-0 text-sm leading-tight font-semibold wrap-break-word text-ink lg:text-[0.78rem]">
        {option.name}
      </p>
      <div className="col-start-1 flex flex-wrap items-center gap-x-1 text-xs text-muted lg:contents">
        <span className="tabular-nums lg:col-start-2 lg:row-start-1 lg:justify-self-end lg:text-[0.7rem]">
          {option.price > 0 ? `+${formatBdt(option.price)}` : 'Free'}
        </span>
        <span aria-hidden="true" className="lg:hidden">
          ·
        </span>
        <span
          className={`whitespace-nowrap lg:col-start-1 lg:row-start-2 lg:justify-self-start lg:rounded-full lg:px-1.5 lg:py-0.5 lg:text-[0.65rem] lg:leading-none lg:font-medium ${noStock ? 'font-semibold text-red-700 lg:bg-red-50' : 'lg:bg-page'}`}
        >
          {stockLabel(headroom)}
        </span>
      </div>
      <div className="col-start-2 row-span-2 row-start-1 lg:row-span-1 lg:row-start-2">
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
