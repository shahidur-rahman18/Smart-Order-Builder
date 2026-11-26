import type { ReactNode } from 'react'
import { formatBdt } from '../../engine/money'
import type { PricePreview } from '../../hooks/usePricePreview'
import type { Menu } from '../../types/menu'
import { Stepper } from '../common/Stepper'

interface Props {
  menu: Menu
  preview: PricePreview
  quantity: number
  onQuantity: (quantity: number) => void
  problemCount: number
  actions: ReactNode // Add to cart / Save changes / Cancel…
  reason: string | null // why the main button cannot be pressed (shown under it)
}

// "Combo 10%": the percent comes from the menu's promotion, not from code.
function comboLabel(menu: Menu): string {
  const combo = menu.promotions.find((p) => p.type === 'comboPercent')
  return combo?.type === 'comboPercent' ? `Combo ${combo.percent}%` : 'Combo'
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.65rem] font-semibold tracking-wider whitespace-nowrap text-white/50 uppercase">{label}</dt>
      <dd className="mt-0.5 font-semibold whitespace-nowrap tabular-nums">{value}</dd>
    </div>
  )
}

// Dark bar at the bottom of the builder: live server price, quantity and the main button.
// While a new price is on its way the old one stays, greyed out, so nothing jumps.
export function PriceBar({ menu, preview, quantity, onQuantity, problemCount, actions, reason }: Props) {
  const { status, body, error, retry } = preview
  const unit = body?.breakdown ?? null
  const stale = status !== 'ready'
  const max = menu.shop.maxItemQuantity

  let statusText = ''
  if (status === 'loading') statusText = 'Updating…'
  else if (status === 'ready') statusText = 'Updated just now'

  return (
    <section
      aria-label="Price"
      className="-mx-4 rounded-t-2xl bg-ink px-4 py-2 text-white shadow-lg sm:mx-0 sm:rounded-2xl"
    >
      {/* Row 1: status on the left, price freshness (or a price error) on the right. */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          {problemCount > 0 ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-semibold text-amber-800">
              {problemCount} {problemCount === 1 ? 'fix' : 'fixes'} needed
            </span>
          ) : (
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700">Ready</span>
          )}
          <span className="hidden text-white/60 sm:inline">This item · live price from server</span>
        </div>
        {status === 'error' ? (
          <div role="alert" className="flex items-center gap-2 text-red-300">
            <span>{error} Your selection is kept.</span>
            <button
              type="button"
              className="rounded-md bg-white/10 px-2 py-0.5 font-semibold text-white hover:bg-white/20"
              onClick={retry}
            >
              Retry price
            </button>
          </div>
        ) : (
          <span className="text-white/60">{statusText}</span>
        )}
      </div>

      {/* Row 2: breakdown | unit price | quantity | button. One line from lg up. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-3 lg:flex-nowrap">
        {unit && (
          <dl
            className={`hidden flex-1 grid-cols-4 gap-3 border-r border-white/15 pr-4 text-sm transition-opacity md:grid ${stale ? 'opacity-50' : ''}`}
          >
            <Figure label="Base" value={formatBdt(unit.base)} />
            <Figure label="Options" value={`+${formatBdt(unit.optionsTotal)}`} />
            <Figure
              label="Extras deal"
              value={unit.cheapestFree.discount > 0 ? `−${formatBdt(unit.cheapestFree.discount)}` : '—'}
            />
            <Figure label={comboLabel(menu)} value={unit.combo.applied ? `−${formatBdt(unit.combo.discount)}` : '—'} />
          </dl>
        )}

        <div className="flex w-full items-center justify-between gap-3 md:w-auto">
          <div
            className={`rounded-xl border border-primary/60 bg-primary/15 px-3 py-1.5 transition-opacity ${stale ? 'opacity-50' : ''}`}
          >
            <p className="text-[0.65rem] font-semibold tracking-wider text-orange-200 uppercase">Unit price</p>
            <p className="text-xl font-bold whitespace-nowrap tabular-nums">
              {unit ? `BDT ${formatBdt(unit.unitPrice)}` : '…'}
            </p>
            {unit && (
              <p className="text-xs text-white/60 md:hidden">
                Base {formatBdt(unit.base)} · Options +{formatBdt(unit.optionsTotal)}
                {unit.cheapestFree.discount > 0 && ` · Extras deal −${formatBdt(unit.cheapestFree.discount)}`}
                {unit.combo.applied && ` · ${comboLabel(menu)} −${formatBdt(unit.combo.discount)}`}
              </p>
            )}
          </div>
          <div>
            <p className="mb-1 text-[0.65rem] font-semibold tracking-wider text-white/50 uppercase">Quantity</p>
            <Stepper
              tone="dark"
              compact
              value={quantity}
              label={menu.product.name}
              valueLabel="Quantity"
              onChange={onQuantity}
              minusDisabledReason={quantity <= 1 ? 'At least 1' : undefined}
              plusDisabledReason={quantity >= max ? `At most ${max} per item` : undefined}
            />
          </div>
        </div>

        <div className="w-full md:w-auto md:min-w-48 lg:w-52 lg:shrink-0">
          <div className="flex flex-wrap gap-2 [&>button]:flex-1">{actions}</div>
          <p className="mt-1 text-center text-[0.7rem] leading-tight text-white/60">
            Line total{' '}
            <output aria-label="Line total" className="tabular-nums">
              {!body || body.lineTotal === null ? '—' : `BDT ${formatBdt(body.lineTotal)}`}
            </output>
            {reason && ` · ${reason}`}
          </p>
        </div>
      </div>
    </section>
  )
}
