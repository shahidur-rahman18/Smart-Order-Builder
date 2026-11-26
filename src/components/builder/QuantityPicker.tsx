import { input } from '../ui'

interface Props {
  value: number
  max: number // from the menu (shop.maxItemQuantity)
  onChange: (quantity: number) => void
}

// How many of this whole breakfast: 1…max. Stock use is multiplied by it.
export function QuantityPicker({ value, max, onChange }: Props) {
  const choices = Array.from({ length: max }, (_, index) => index + 1)
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-medium text-muted">Quantity</span>
      <select
        className={`${input} w-20`}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {choices.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  )
}
