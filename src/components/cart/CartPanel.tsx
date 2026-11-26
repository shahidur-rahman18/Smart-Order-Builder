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
import { btnDanger, btnPrimary, card } from '../ui'

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
    <section aria-labelledby="cart-heading" className={`${card} space-y-4`}>
      <div className="flex items-center justify-between gap-2">
        <h2 id="cart-heading" className="text-lg font-bold text-ink">
          Cart
        </h2>
        {items.length > 0 && (
          <span className="rounded-full bg-selected px-2.5 py-0.5 text-xs font-semibold text-primary-hover">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>

      {cart.error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {cart.error}
        </p>
      )}
      {cart.cart === null && !cart.error && <p className="text-sm text-muted">Loading cart…</p>}
      {cart.cart !== null && items.length === 0 && (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          Your cart is empty.
        </p>
      )}

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

      <div className="space-y-2">
        <PaymentSelect value={paymentMethod} onChange={setPaymentMethod} />
        <button
          type="button"
          className={`${btnPrimary} w-full`}
          disabled={payReason !== null}
          title={payReason ?? undefined}
          onClick={pay}
        >
          {totals && totals.lines.length > 0 ? `Pay BDT ${formatBdt(totals.payable)}` : 'Pay'}
        </button>
        {payReason && <p className="text-center text-xs text-muted">{payReason}</p>}
      </div>

      {checkout.status === 'paid' && checkout.order && (
        <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium break-all text-emerald-700">
          Order placed: {checkout.order.id} · BDT {formatBdt(checkout.order.totals.payable)}
        </p>
      )}
      {checkout.failure && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          <span>{checkout.failure.message}</span>
          {checkout.failure.canRetry && (
            <button
              type="button"
              className={btnDanger}
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
