import { PAYMENT_LABELS, PAYMENT_METHODS, type PaymentMethod } from '../../types/order'

interface Props {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
}

// One button per method. Real radio inputs underneath, so the keyboard
// (arrow keys) and screen readers work as for any radio group.
export function PaymentSelect({ value, onChange }: Props) {
  return (
    <fieldset>
      <legend className="mb-1 text-[0.8rem] font-semibold text-ink">Payment method</legend>
      <div className="grid grid-cols-3 gap-2">
        {PAYMENT_METHODS.map((method) => (
          <label
            key={method}
            className={`flex h-9 cursor-pointer items-center justify-center rounded-lg border text-sm font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary ${value === method ? 'border-primary bg-selected text-primary-hover' : 'border-line bg-white text-ink hover:bg-page'}`}
          >
            <input
              type="radio"
              name="payment-method"
              value={method}
              checked={value === method}
              onChange={() => onChange(method)}
              className="sr-only"
            />
            {PAYMENT_LABELS[method]}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
