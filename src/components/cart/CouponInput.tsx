import { useState } from 'react'
import type { Menu } from '../../types/menu'
import { btnSecondaryCompact, inputCompact } from '../ui'

interface Props {
  menu: Menu
  savedCode: string | null // what the server has for this cart
  appliedId: string | null // promotion id of the coupon the server applied, or null
  pending: boolean
  onApply: (code: string | null) => void
}

// D2: the price is locked at Pay, so a time-limited coupon can stop working
// while the item waits in the cart. We say so up front, from the menu data.
function timeLimitNotes(menu: Menu): string[] {
  return menu.promotions.flatMap((promo) =>
    promo.type === 'couponPercent'
      ? [`${promo.code} works only before ${promo.validBefore} (${menu.shop.timeZone}), checked when you pay.`]
      : [],
  )
}

// Short green note under an applied coupon, e.g. "Applied · valid before 11:00, checked at Pay".
function appliedNote(menu: Menu, appliedId: string | null): string | null {
  const promo = menu.promotions.find((p) => p.id === appliedId)
  if (promo?.type !== 'couponPercent') return null
  return `Applied · valid before ${promo.validBefore}, checked at Pay`
}

export function CouponInput({ menu, savedCode, appliedId, pending, onApply }: Props) {
  const [text, setText] = useState(savedCode ?? '')
  const unchanged = text.trim() === (savedCode ?? '')
  const applied = appliedNote(menu, appliedId)

  let applyReason: string | null = null
  if (pending) applyReason = 'Saving…'
  else if (unchanged) applyReason = savedCode ? 'This code is already applied' : 'Type a code first'

  return (
    <div className="space-y-1">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          // An empty box + Apply removes the saved coupon.
          if (applyReason === null) onApply(text.trim() === '' ? null : text)
        }}
      >
        <label htmlFor="coupon-code" className="mb-1 block text-[0.8rem] font-semibold text-ink">
          Coupon code
        </label>
        <div className="flex gap-2">
          <input
            id="coupon-code"
            className={`${inputCompact} min-w-0 flex-1 uppercase placeholder:normal-case`}
            placeholder="Enter code"
            value={text}
            onChange={(event) => setText(event.target.value)}
            autoComplete="off"
          />
          <button
            type="submit"
            className={btnSecondaryCompact}
            disabled={applyReason !== null}
            title={applyReason ?? (text.trim() === '' ? 'Remove the coupon' : undefined)}
          >
            Apply
          </button>
        </div>
      </form>
      {applied ? (
        <p className="text-[0.7rem] font-medium leading-snug text-emerald-700">{applied}</p>
      ) : (
        timeLimitNotes(menu).map((note) => (
          <p key={note} className="text-[0.7rem] leading-snug text-muted">
            {note}
          </p>
        ))
      )}
    </div>
  )
}
