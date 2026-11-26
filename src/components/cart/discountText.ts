import { formatBdt } from '../../engine/money'
import type { Menu, Poisha } from '../../types/menu'
import type { DiscountCandidate } from '../../types/pricing'

// "150.00" → "150", "60.50" stays "60.50". Display only; the number still comes from formatBdt().
export function bdtShort(poisha: Poisha): string {
  return formatBdt(poisha).replace(/\.00$/, '')
}

// A short name for a cart discount, built from its promotion data (no ids or codes in code):
// coupon → "MORNING15 (15%, max 150)", fixed → "Over 1,200 (−100)".
export function discountLabel(candidate: DiscountCandidate, menu: Menu): string {
  const promo = menu.promotions.find((p) => p.id === candidate.id)
  if (promo?.type === 'couponPercent') return `${promo.code} (${promo.percent}%, max ${bdtShort(promo.cap)})`
  if (promo?.type === 'cartFixed') return `Over ${bdtShort(promo.minSubtotal)} (−${bdtShort(promo.amount)})`
  return candidate.id
}

// Why a discount that is NOT applied is shown greyed out.
export function notUsedNote(candidate: DiscountCandidate, appliedAmount: Poisha | null): string {
  if (!candidate.eligible) return candidate.reason
  // Eligible but lost: only the best cart discount applies (SPEC Part C step 5).
  if (appliedAmount !== null && candidate.amount < appliedAmount) return 'smaller, not used'
  return 'not used'
}
