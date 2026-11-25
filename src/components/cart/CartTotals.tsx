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
    <section aria-label="Totals" className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span aria-label="Subtotal">{bdt(totals.subtotal)}</span>
      </div>

      <ul className="space-y-1">
        {totals.candidates.map((candidate) => {
          const isApplied = applied?.id === candidate.id
          return (
            <li key={candidate.id} className={isApplied ? 'text-green-700' : 'text-slate-500'}>
              <div className="flex justify-between gap-2">
                <span>
                  {discountName(candidate, menu)} {isApplied ? '(applied)' : '(not applied)'}
                </span>
                {isApplied && <span>− {bdt(candidate.amount)}</span>}
              </div>
              <p className="text-xs">{candidate.reason}</p>
            </li>
          )
        })}
      </ul>
      {/* The one case the list above cannot explain: the coupon is valid, but only the best discount applies. */}
      {totals.coupon.status === 'lost_to_better_discount' && (
        <p className="text-xs text-slate-500">{totals.coupon.reason}</p>
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
        <div className="flex justify-between text-slate-500">
          <span>Rounding to whole BDT</span>
          <span>
            {rounding > 0 ? '+' : '−'} {bdt(Math.abs(rounding))}
          </span>
        </div>
      )}
      <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
        <span>Payable</span>
        <span aria-label="Payable">{bdt(totals.payable)}</span>
      </div>
    </section>
  )
}
