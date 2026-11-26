import type { ReactNode } from 'react'
import { formatBdt } from '../../engine/money'
import type { Menu, Poisha } from '../../types/menu'
import type { CartBreakdown } from '../../types/pricing'
import { bdtShort, discountLabel, notUsedNote } from './discountText'

interface Props {
  menu: Menu
  totals: CartBreakdown
}

// Full breakdown (SPEC Part C): subtotal, every cart discount (the applied one in green,
// the others struck through with why), VAT, and the payable amount rounded to whole BDT.
export function CartTotals({ menu, totals }: Props) {
  const applied = totals.appliedDiscount
  const rounding = totals.payable - totals.payableExact

  return (
    <section aria-label="Totals" className="space-y-1.5 rounded-xl bg-page px-3 py-2.5 text-xs text-muted">
      <Line label="Subtotal">
        <Amount label="Subtotal" poisha={totals.subtotal} />
      </Line>

      <ul className="space-y-1.5">
        {totals.candidates.map((candidate) => {
          const isApplied = applied?.id === candidate.id
          const name = discountLabel(candidate, menu)
          return (
            <li key={candidate.id} className="flex justify-between gap-2">
              {isApplied ? (
                <span className="font-semibold text-emerald-700" title={candidate.reason}>
                  {name}
                </span>
              ) : (
                <span className="leading-snug">
                  {name} · {notUsedNote(candidate, applied?.amount ?? null)}
                </span>
              )}
              {candidate.amount > 0 && (
                <span
                  className={`shrink-0 tabular-nums ${isApplied ? 'font-semibold text-emerald-700' : 'line-through'}`}
                >
                  −{formatBdt(candidate.amount)}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      <Line label={`VAT ${menu.shop.vatPercent}%`}>
        <Amount label="VAT" poisha={totals.vat} />
      </Line>
      {rounding !== 0 && (
        <Line label="Rounding to whole BDT">
          {rounding > 0 ? '+' : '−'}
          {formatBdt(Math.abs(rounding))}
        </Line>
      )}
      <div className="flex items-baseline justify-between border-t border-line pt-2 text-ink">
        <span className="text-sm font-semibold">Payable</span>
        <span aria-label="Payable" className="text-lg font-extrabold tracking-tight tabular-nums">
          BDT {bdtShort(totals.payable)}
        </span>
      </div>
    </section>
  )
}

// The amount alone on screen; "BDT" is read out only by screen readers (and checked by tests).
function Amount({ label, poisha }: { label: string; poisha: Poisha }) {
  return (
    <span aria-label={label}>
      <span className="sr-only">BDT </span>
      {formatBdt(poisha)}
    </span>
  )
}

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{label}</span>
      <span className="tabular-nums">{children}</span>
    </div>
  )
}
