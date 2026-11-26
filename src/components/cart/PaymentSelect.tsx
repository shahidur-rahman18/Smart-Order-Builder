import { PAYMENT_LABELS, PAYMENT_METHODS, type PaymentMethod } from '../../types/order'

import { input } from '../ui'

interface Props {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
}

export function PaymentSelect({ value, onChange }: Props) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-muted">Payment</span>
      <select
        className={`${input} w-full`}
        value={value}
        onChange={(event) => {
          const chosen = PAYMENT_METHODS.find((method) => method === event.target.value)
          if (chosen) onChange(chosen)
        }}
      >
        {PAYMENT_METHODS.map((method) => (
          <option key={method} value={method}>
            {PAYMENT_LABELS[method]}
          </option>
        ))}
      </select>
    </label>
  )
}
