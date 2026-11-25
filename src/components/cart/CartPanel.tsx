import { useState } from 'react'
import { formatBdt } from '../../engine/money'
import type { CartState } from '../../hooks/useCart'
import { useCheckout } from '../../hooks/useCheckout'
import type { CartItemView } from '../../types/cart'
import type { Menu } from '../../types/menu'
import { PAYMENT_METHODS, type PaymentMethod, type StoredOrder } from '../../types/order'
import { CartItemRow } from './CartItemRow'
import { CartTotals } from './CartTotals'
import { CouponInput } from './CouponInput'
import { PaymentSelect } from './PaymentSelect'

interface Props {
  menu: Menu
  cart: CartState
  editingId: string | null
  onEdit: (item: CartItemView) => void
  onPaid?: (order: StoredOrder) => void
}

export function CartPanel({ menu, cart, editingId, onEdit, onPaid }: Props) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PAYMENT_METHODS[0])
  const checkout = useCheckout((order) => {
    cart.refresh()
    onPaid?.(order)
  })
  const items = cart.cart?.items ?? []
  const totals = cart.totals
  const paying = checkout.status === 'pending'

  // Why Pay cannot be pressed right now (shown as title and as text).
  let payReason: string | null = null
  if (cart.cart === null || totals === null) payReason = 'Loading cart…'
  else if (totals.lines.length === 0) payReason = 'Nothing active in the cart to pay for.'
  else if (editingId !== null) payReason = 'Save or cancel your edit first.'
  else if (cart.couponPending) payReason = 'Saving the coupon…'
  else if (paying) payReason = 'Paying…'

  function pay(): void {
    if (cart.cart) checkout.pay(cart.cart.version, paymentMethod)
  }

  return (
    <section aria-labelledby="cart-heading" className="space-y-3">
      <h2 id="cart-heading" className="text-lg font-semibold">
        Cart
      </h2>

      {cart.error && (
        <p role="alert" className="text-sm text-red-700">
          {cart.error}
        </p>
      )}
      {cart.cart === null && !cart.error && <p className="text-sm text-slate-500">Loading cart…</p>}
      {cart.cart !== null && items.length === 0 && <p className="text-sm text-slate-500">Your cart is empty.</p>}

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <CartItemRow
              key={item.id}
              item={item}
              position={index + 1}
              menu={menu}
              removing={cart.removingId === item.id}
              editing={editingId === item.id}
              onEdit={() => onEdit(item)}
              onRemove={() => cart.remove(item.id)}
              onExpired={cart.refresh}
            />
          ))}
        </ul>
      )}

      {cart.cart !== null && (
        // key: when the saved code changes (here, another tab, or after Pay) the box shows it.
        <CouponInput
          key={cart.cart.couponCode ?? ''}
          menu={menu}
          savedCode={cart.cart.couponCode}
          pending={cart.couponPending}
          onApply={cart.setCoupon}
        />
      )}

      {totals && totals.lines.length > 0 && <CartTotals menu={menu} totals={totals} />}

      <div className="flex flex-wrap items-center gap-3">
        <PaymentSelect value={paymentMethod} onChange={setPaymentMethod} />
        <button
          type="button"
          className="rounded bg-slate-900 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={payReason !== null}
          title={payReason ?? undefined}
          onClick={pay}
        >
          {totals && totals.lines.length > 0 ? `Pay BDT ${formatBdt(totals.payable)}` : 'Pay'}
        </button>
        {payReason && <span className="text-sm text-slate-500">{payReason}</span>}
      </div>

      {checkout.status === 'paid' && checkout.order && (
        <p role="status" className="text-sm text-green-700">
          Order placed: {checkout.order.id} · BDT {formatBdt(checkout.order.totals.payable)}
        </p>
      )}
      {checkout.failure && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-red-700">
          <span>{checkout.failure.message}</span>
          {checkout.failure.canRetry && (
            <button
              type="button"
              className="rounded border border-red-300 px-3 py-1"
              disabled={payReason !== null}
              title={payReason ?? undefined}
              onClick={pay}
            >
              Retry
            </button>
          )}
        </div>
      )}
    </section>
  )
}
