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
      className="-mx-4 rounded-t-2xl bg-ink px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] text-white shadow-[0_-8px_24px_rgba(0,0,0,0.15)] sm:mx-0 sm:rounded-2xl sm:pb-2.5 lg:py-2 lg:shadow-lg"
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
          <div role="alert" className="flex w-full items-center justify-between gap-2 text-[0.7rem] leading-tight text-red-300 sm:w-auto sm:text-xs">
            <span>{error} Your selection is kept.</span>
            <button
              type="button"
              className="shrink-0 rounded-md bg-white/10 px-2 py-0.5 font-semibold whitespace-nowrap text-white hover:bg-white/20"
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
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2.5 lg:flex-nowrap">
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

        {/* Phones: plain big price on the left, quantity on the right. From md: price in a box. */}
        <div className="flex w-full items-end justify-between gap-3 md:w-auto md:items-center">
          <div
            className={`min-w-0 transition-opacity md:rounded-xl md:border md:border-primary/60 md:bg-primary/15 md:px-3 md:py-1.5 ${stale ? 'opacity-50' : ''}`}
          >
            <p className="text-[0.65rem] font-semibold tracking-wider text-orange-200 uppercase">Unit price</p>
            <p className="text-2xl font-bold whitespace-nowrap tabular-nums md:text-xl">
              {unit ? `BDT ${formatBdt(unit.unitPrice)}` : '…'}
            </p>
            {unit && (
              <p className="mt-0.5 text-xs text-white/60 md:hidden">
                Base {formatBdt(unit.base)} · Options +{formatBdt(unit.optionsTotal)}
                {unit.cheapestFree.discount > 0 && ` · Extras deal −${formatBdt(unit.cheapestFree.discount)}`}
                {unit.combo.applied && ` · ${comboLabel(menu)} −${formatBdt(unit.combo.discount)}`}
              </p>
            )}
          </div>
          <div>
            <p className="mb-1 hidden text-[0.65rem] font-semibold tracking-wider text-white/50 uppercase md:block">
              Quantity
            </p>
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
          <div className="flex flex-wrap gap-2 [&>button]:h-11 [&>button]:flex-1 [&>button]:rounded-xl md:[&>button]:h-10 md:[&>button]:rounded-lg [&>button:disabled]:bg-white/10 [&>button:disabled]:text-white/45">
            {actions}
          </div>
          <p className="mt-1 text-center text-[0.7rem] leading-tight text-white/50">
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
