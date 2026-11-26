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
import { bdtShort } from './discountText'
import { PaymentSelect } from './PaymentSelect'
import { Card } from '../common/Card'
import { btnDanger, btnPrimaryLg } from '../ui'

interface Props {
  menu: Menu
  cart: CartState
  editingId: string | null
  onEdit: (item: CartItemView) => void
  onPaid?: (order: StoredOrder) => void
}

export function CartPanel({ menu, cart, editingId, onEdit, onPaid }: Props) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PAYMENT_METHODS[0])
  const checkout = useCheckout(
    (order) => {
      cart.refresh()
      onPaid?.(order)
    },
    cart.refresh, // after any failure, show the cart as it really is now
  )
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
    <Card
      as="section"
      ariaLabelledBy="cart-heading"
      headingLevel={2}
      headingId="cart-heading"
      title="Cart"
      aside={
        items.length > 0 && (
          <span className="pt-0.5 text-xs text-muted">
            {items.length} {items.length === 1 ? 'item' : 'items'} · stock held for you
          </span>
        )
      }
      className="flex flex-col lg:h-full"
    >
      {/* Only this middle part scrolls on a short screen; Pay always stays in view right under it. */}
      <div className="-mx-1 flex flex-col gap-2.5 px-1 lg:min-h-0 lg:overflow-y-auto lg:[scrollbar-width:thin]">
        {cart.error && (
          <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {cart.error}
          </p>
        )}
        {cart.conflict && (
          <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {cart.conflict}
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
                onRemove={() => cart.remove(item)}
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
            appliedId={totals?.coupon.applied ? (totals.appliedDiscount?.id ?? null) : null}
            pending={cart.couponPending}
            onApply={cart.setCoupon}
          />
        )}

        {totals && totals.lines.length > 0 && <CartTotals menu={menu} totals={totals} />}
      </div>

      <div className="shrink-0 space-y-2 pt-2.5">
        <PaymentSelect value={paymentMethod} onChange={setPaymentMethod} />
        <button
          type="button"
          className={`${btnPrimaryLg} w-full`}
          disabled={payReason !== null}
          title={payReason ?? undefined}
          onClick={pay}
        >
          {totals && totals.lines.length > 0 ? `Pay BDT ${bdtShort(totals.payable)}` : 'Pay'}
        </button>
        {payReason && <p className="text-center text-xs text-muted">{payReason}</p>}

        {checkout.status === 'paid' && checkout.order && (
          <p
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium break-all text-emerald-700"
          >
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
      </div>
    </Card>
  )
}
