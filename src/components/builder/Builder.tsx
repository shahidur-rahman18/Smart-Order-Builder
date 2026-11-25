import { useMemo, useState } from 'react'
import { optionHeadroom, shortagesFor, usageOf } from '../../engine/stock'
import { validate } from '../../engine/validate'
import { useAddToCart } from '../../hooks/useAddToCart'
import { usePricePreview } from '../../hooks/usePricePreview'
import { useStock } from '../../hooks/useStock'
import type { ItemBody } from '../../types/api'
import type { Config, Menu, OptionId } from '../../types/menu'
import { GroupSection } from './GroupSection'
import { PricePreview } from './PricePreview'
import { QuantityPicker } from './QuantityPicker'
import { ViolationList } from './ViolationList'

interface Props {
  menu: Menu
  onAdded?: (body: ItemBody) => void
}

// Config keeps only options with qty > 0 (same shape the server expects).
function withQty(config: Config, optionId: OptionId, qty: number): Config {
  const next = { ...config }
  if (qty > 0) next[optionId] = qty
  else delete next[optionId]
  return next
}

// Everything on screen comes from `menu`: groups, options, prices, limits.
export function Builder({ menu, onAdded }: Props) {
  const [config, setConfig] = useState<Config>({})
  const [quantity, setQuantity] = useState(1)
  const stock = useStock()
  const preview = usePricePreview(config, quantity)
  const addToCart = useAddToCart((body) => {
    setConfig({})
    setQuantity(1)
    stock.refresh()
    onAdded?.(body)
  }, stock.refresh)

  // Same rules engine as the server, so the user sees problems before sending.
  const violations = useMemo(() => validate(config, menu.groups, menu.rules), [config, menu])

  const headroom = useMemo(
    () => (stock.available ? optionHeadroom(menu, stock.available, config, quantity) : null),
    [menu, stock.available, config, quantity],
  )

  // The draft itself may already be too big (e.g. another tab took the stock).
  const shortages = useMemo(
    () => (stock.available ? shortagesFor(usageOf(config, menu, quantity), stock.available, menu) : []),
    [menu, stock.available, config, quantity],
  )

  function changeOption(optionId: OptionId, qty: number): void {
    setConfig((old) => withQty(old, optionId, qty))
    addToCart.clearMessage()
  }

  function changeQuantity(next: number): void {
    setQuantity(next)
    addToCart.clearMessage()
  }

  function add(): void {
    addToCart.add(config, quantity)
  }

  const pending = addToCart.status === 'pending'
  let disabledReason: string | null = null
  if (stock.available === null) disabledReason = 'Loading stock…'
  else if (violations.length > 0) disabledReason = 'Fix the problems above first.'
  else if (shortages.length > 0) disabledReason = 'Not enough stock for this item.'
  else if (pending) disabledReason = 'Adding…'

  const failure = addToCart.failure

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{menu.product.name}</h2>

      {menu.groups.map((group) => (
        <GroupSection key={group.id} group={group} config={config} headroom={headroom} onChange={changeOption} />
      ))}

      <ViolationList violations={violations} />

      {shortages.length > 0 && (
        <p className="text-sm text-red-700">
          Short: {shortages.map((s) => `${s.missing} ${s.name}`).join(', ')}
        </p>
      )}

      <PricePreview preview={preview} />

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <QuantityPicker value={quantity} max={menu.shop.maxItemQuantity} onChange={changeQuantity} />
        <button
          type="button"
          className="rounded bg-slate-900 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={disabledReason !== null}
          title={disabledReason ?? undefined}
          onClick={add}
        >
          Add to cart
        </button>
        {disabledReason && <span className="text-sm text-slate-500">{disabledReason}</span>}
      </div>

      {addToCart.status === 'added' && (
        <p role="status" className="text-sm text-green-700">
          Added to cart.
        </p>
      )}

      {failure && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-red-700">
          <span>{failure.message}</span>
          {failure.canRetry && (
            <button type="button" className="rounded border border-red-300 px-3 py-1" disabled={pending} onClick={add}>
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  )
}
