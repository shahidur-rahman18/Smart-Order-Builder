import { useState } from 'react'
import type { Menu } from '../../types/menu'

interface Props {
  menu: Menu
  savedCode: string | null // what the server has for this cart
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

export function CouponInput({ menu, savedCode, pending, onApply }: Props) {
  const [text, setText] = useState(savedCode ?? '')
  const unchanged = text.trim() === (savedCode ?? '')

  let applyReason: string | null = null
  if (pending) applyReason = 'Saving…'
  else if (unchanged) applyReason = savedCode ? 'This code is already applied' : 'Type a code first'

  return (
    <div className="space-y-1">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (applyReason === null) onApply(text.trim() === '' ? null : text)
        }}
      >
        <label className="flex min-w-0 flex-1 flex-col text-sm">
          <span className="font-medium">Coupon code</span>
          <input
            className="rounded border border-slate-300 px-2 py-1"
            value={text}
            onChange={(event) => setText(event.target.value)}
            autoComplete="off"
          />
        </label>
        <button
          type="submit"
          className="rounded border border-slate-300 bg-white px-3 py-1 disabled:opacity-50"
          disabled={applyReason !== null}
          title={applyReason ?? undefined}
        >
          Apply
        </button>
        {savedCode && (
          <button
            type="button"
            className="rounded border border-slate-300 bg-white px-3 py-1 disabled:opacity-50"
            disabled={pending}
            title={pending ? 'Saving…' : undefined}
            onClick={() => {
              setText('')
              onApply(null)
            }}
          >
            Clear
          </button>
        )}
      </form>
      {timeLimitNotes(menu).map((note) => (
        <p key={note} className="text-xs text-slate-500">
          {note}
        </p>
      ))}
    </div>
  )
}
