import { PAYMENT_LABELS, PAYMENT_METHODS, type PaymentMethod } from '../../types/order'

interface Props {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
}

export function PaymentSelect({ value, onChange }: Props) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-medium">Payment</span>
      <select
        className="rounded border border-slate-300 bg-white px-2 py-1"
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
