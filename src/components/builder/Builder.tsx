import { useEffect, useMemo, useState } from 'react'
import { availableForEdit, optionHeadroom, shortagesFor, usageOf } from '../../engine/stock'
import { validate } from '../../engine/validate'
import { useAddToCart } from '../../hooks/useAddToCart'
import { formatCountdown, useCountdown } from '../../hooks/useCountdown'
import { useEditItem } from '../../hooks/useEditItem'
import { usePricePreview } from '../../hooks/usePricePreview'
import { useStock } from '../../hooks/useStock'
import type { ItemBody } from '../../types/api'
import type { CartItemView } from '../../types/cart'
import type { Config, Menu, OptionId } from '../../types/menu'
import { formatBdt } from '../../engine/money'
import { GroupSection } from './GroupSection'
import { GroupTabs } from './GroupTabs'
import { groupStatus } from './groupStatus'
import { PriceBar } from './PriceBar'
import { ViolationList } from './ViolationList'
import { btnDanger, btnPrimary, btnSecondary } from '../ui'

const EXPIRED_MESSAGE = 'Reservation expired. Stock was released.'

interface Props {
  menu: Menu
  onAdded?: (body: ItemBody) => void
  // Changes whenever the cart changes (e.g. Remove): freed stock should show at once.
  cartVersion?: number
  // Edit mode: the cart item being changed. The parent gives the Builder a new
  // `key` per item, so config/quantity below start from this item.
  editing?: CartItemView | null
  onEditDone?: () => void // saved, added as new, or cancelled
}

// Config keeps only options with qty > 0 (same shape the server expects).
function withQty(config: Config, optionId: OptionId, qty: number): Config {
  const next = { ...config }
  if (qty > 0) next[optionId] = qty
  else delete next[optionId]
  return next
}

const buttonClass = btnPrimary

// Everything on screen comes from `menu`: groups, options, prices, limits.
export function Builder({ menu, onAdded, cartVersion, editing = null, onEditDone }: Props) {
  const [config, setConfig] = useState<Config>(() => editing?.config ?? {})
  const [quantity, setQuantity] = useState(() => editing?.quantity ?? 1)
  const stock = useStock()
  const refreshStock = stock.refresh
  useEffect(() => {
    if (cartVersion !== undefined) refreshStock()
  }, [cartVersion, refreshStock])

  const preview = usePricePreview(config, quantity)
  const addToCart = useAddToCart((body) => {
    setConfig({})
    setQuantity(1)
    stock.refresh()
    onAdded?.(body)
    onEditDone?.()
  }, stock.refresh)
  const editItem = useEditItem(
    editing,
    () => {
      stock.refresh()
      onEditDone?.()
    },
    stock.refresh,
  )

  // D3: in edit mode, count down with server time; at 0 (or a 410) Save is over.
  const msLeft = useCountdown(editing?.expiresAt ?? null)
  const editExpired = editing !== null && (msLeft === 0 || editItem.expired)
  const canSave = editing !== null && !editExpired

  // Stock this draft may use. While an edit can still be saved, the item's own
  // share counts as available to it (net difference, same as the server).
  const available = useMemo(() => {
    if (!stock.available) return null
    return canSave && editing ? availableForEdit(stock.available, editing, menu) : stock.available
  }, [stock.available, canSave, editing, menu])

  // Same rules engine as the server, so the user sees problems before sending.
  const violations = useMemo(() => validate(config, menu.groups, menu.rules), [config, menu])
  // For the screen: the same sentence twice (e.g. min and step both broken) is shown once.
  const problems = violations.filter((v, i) => violations.findIndex((w) => w.message === v.message) === i)

  const headroom = useMemo(
    () => (available ? optionHeadroom(menu, available, config, quantity) : null),
    [menu, available, config, quantity],
  )

  // The draft itself may already be too big (e.g. another tab took the stock).
  const shortages = useMemo(
    () => (available ? shortagesFor(usageOf(config, menu, quantity), available, menu) : []),
    [menu, available, config, quantity],
  )

  function clearMessages(): void {
    addToCart.clearMessage()
    editItem.clearMessage()
  }

  function changeOption(optionId: OptionId, qty: number): void {
    setConfig((old) => withQty(old, optionId, qty))
    clearMessages()
  }

  function changeQuantity(next: number): void {
    setQuantity(next)
    clearMessages()
  }

  function add(): void {
    addToCart.add(config, quantity)
  }

  function save(): void {
    editItem.save(config, quantity)
  }

  // One reason why the draft cannot be sent at all; shown next to the button.
  let draftProblem: string | null = null
  if (available === null) draftProblem = 'Loading stock…'
  else if (violations.length > 0)
    draftProblem = `Fix ${problems.length} ${problems.length === 1 ? 'item' : 'items'} first`
  else if (shortages.length > 0) draftProblem = 'Not enough stock for this item.'

  const adding = addToCart.status === 'pending'
  const saving = editItem.status === 'pending'
  const addReason = draftProblem ?? (adding ? 'Adding…' : null)
  let saveReason: string | null = editExpired ? EXPIRED_MESSAGE : draftProblem
  if (saveReason === null && saving) saveReason = 'Saving…'

  // The failure that belongs to the button on screen.
  const failure = canSave ? editItem.failure : addToCart.failure
  const retry = canSave ? save : add
  const busy = adding || saving

  // One status per group: the card badge, the yellow outline and the phone chips.
  const statuses = menu.groups.map((group) => groupStatus(group, config, menu.rules, violations))

  // The main button(s), shown inside the dark price bar.
  const actions = editing ? (
    <>
      <button
        type="button"
        className={buttonClass}
        disabled={saveReason !== null}
        title={saveReason ?? undefined}
        onClick={save}
      >
        Save changes
      </button>
      {editExpired && (
        <button
          type="button"
          className={buttonClass}
          disabled={addReason !== null}
          title={addReason ?? undefined}
          onClick={add}
        >
          Add as new item
        </button>
      )}
      <button
        type="button"
        className={btnSecondary}
        disabled={busy}
        title={busy ? 'Wait for the request to finish' : undefined}
        onClick={onEditDone}
      >
        Cancel edit
      </button>
    </>
  ) : (
    <button
      type="button"
      className={buttonClass}
      disabled={addReason !== null}
      title={addReason ?? undefined}
      onClick={add}
    >
      Add to cart
    </button>
  )
  const reason = editing && !editExpired ? saveReason : addReason

  return (
    // Desktop: one screen, no page scroll. Title and groups on top, price bar at the
    // bottom, and the space between them is kept for messages (problems, errors).
    <div className="flex flex-col gap-3 lg:h-full lg:gap-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-xl font-bold tracking-tight text-ink">
          {editing ? `Editing cart item · ${menu.product.name}` : menu.product.name}
        </h2>
        <p className="text-xs text-muted">
          Base price BDT {formatBdt(menu.product.basePrice)} · stock and price update live
        </p>
      </div>

      {editing && (
        <div
          role={editExpired ? 'alert' : undefined}
          className={`rounded-xl border p-3 text-sm ${editExpired ? 'border-red-200 bg-red-50 text-red-900' : 'border-primary/30 bg-selected text-primary-hover'}`}
        >
          {editExpired ? (
            <p>
              <span className="font-medium">{EXPIRED_MESSAGE}</span> Your changes are kept. Add them as a new item to
              check stock again.
            </p>
          ) : (
            <p>Reservation: {formatCountdown(msLeft ?? 0)} left. Saving does not renew it.</p>
          )}
        </div>
      )}

      <GroupTabs groups={menu.groups} statuses={statuses} />

      {/* Desktop: every group in one row, one equal column each (the count comes from the data). */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:auto-cols-[minmax(0,1fr)] lg:grid-flow-col lg:grid-cols-none lg:gap-2.5">
        {menu.groups.map((group, index) => (
          <GroupSection
            key={group.id}
            group={group}
            config={config}
            status={statuses[index]}
            headroom={headroom}
            onChange={changeOption}
          />
        ))}
      </div>

      {/* The message area: takes the free space, so a new problem never pushes the page. */}
      <div className="flex flex-col gap-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:[scrollbar-width:thin]">
        <ViolationList violations={problems} groups={menu.groups} />

        {/* The server's answer already lists the shortages; don't say it twice. */}
        {shortages.length > 0 && !failure?.shortages.length && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Short: {shortages.map((s) => `${s.missing} ${s.name}`).join(', ')}
          </p>
        )}

        {addToCart.status === 'added' && (
          <p
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
          >
            Added to cart.
          </p>
        )}

        {failure && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            <span>{failure.message}</span>
            {failure.canRetry && (
              <button type="button" className={btnDanger} disabled={busy} onClick={retry}>
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      {/* Sticky on phones; on desktop it simply sits under the message area. */}
      <div className="sticky bottom-0 z-10 lg:static">
        <PriceBar
          menu={menu}
          preview={preview}
          quantity={quantity}
          onQuantity={changeQuantity}
          problemCount={problems.length}
          actions={actions}
          reason={reason}
        />
      </div>
    </div>
  )
}
