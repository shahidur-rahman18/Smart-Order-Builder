import { formatBdt } from '../../engine/money'
import type { Menu } from '../../types/menu'
import type { CartBreakdown, DiscountCandidate } from '../../types/pricing'

interface Props {
  menu: Menu
  totals: CartBreakdown
}

// A readable name for a cart discount, from its promotion data (no ids in code).
function discountName(candidate: DiscountCandidate, menu: Menu): string {
  const promo = menu.promotions.find((p) => p.id === candidate.id)
  if (promo?.type === 'couponPercent') return `Coupon ${promo.code}`
  if (promo?.type === 'cartFixed') return 'Cart discount'
  return candidate.id
}

function bdt(poisha: number): string {
  return `BDT ${formatBdt(poisha)}`
}

// Full breakdown (SPEC Part C): subtotal, every cart discount with why it
// does or does not apply, VAT, and the payable amount rounded to whole BDT.
export function CartTotals({ menu, totals }: Props) {
  const applied = totals.appliedDiscount
  const rounding = totals.payable - totals.payableExact

  return (
    <section aria-label="Totals" className="space-y-2 rounded-xl bg-page p-4 text-sm text-muted">
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span aria-label="Subtotal">{bdt(totals.subtotal)}</span>
      </div>

      <ul className="space-y-1">
        {totals.candidates.map((candidate) => {
          const isApplied = applied?.id === candidate.id
          return (
            <li key={candidate.id} className={isApplied ? 'text-emerald-700' : 'text-muted'}>
              <div className="flex justify-between gap-2">
                <span className={isApplied ? 'font-medium' : undefined}>
                  {discountName(candidate, menu)} {isApplied ? '(applied)' : '(not applied)'}
                </span>
                {isApplied && <span className="shrink-0 font-medium tabular-nums">− {bdt(candidate.amount)}</span>}
              </div>
              <p className="text-xs">{candidate.reason}</p>
            </li>
          )
        })}
      </ul>
      {/* The one case the list above cannot explain: the coupon is valid, but only the best discount applies. */}
      {totals.coupon.status === 'lost_to_better_discount' && (
        <p className="text-xs text-muted">{totals.coupon.reason}</p>
      )}

      <div className="flex justify-between">
        <span>After discount</span>
        <span>{bdt(totals.discountedSubtotal)}</span>
      </div>
      <div className="flex justify-between">
        <span>VAT {menu.shop.vatPercent}%</span>
        <span aria-label="VAT">{bdt(totals.vat)}</span>
      </div>
      {rounding !== 0 && (
        <div className="flex justify-between text-muted">
          <span>Rounding to whole BDT</span>
          <span>
            {rounding > 0 ? '+' : '−'} {bdt(Math.abs(rounding))}
          </span>
        </div>
      )}
      <div className="flex items-baseline justify-between border-t border-dashed border-line pt-2 text-lg font-bold text-ink">
        <span>Payable</span>
        <span aria-label="Payable">{bdt(totals.payable)}</span>
      </div>
    </section>
  )
}
