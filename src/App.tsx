import { useState } from 'react'
import { Builder } from './components/builder/Builder'
import { CartPanel } from './components/cart/CartPanel'
import { DevTools } from './components/DevTools'
import { OrdersPanel } from './components/orders/OrdersPanel'
import { btnDanger } from './components/ui'
import { formatBdt } from './engine/money'
import { useCart } from './hooks/useCart'
import { useMenu } from './hooks/useMenu'
import type { CartItemView } from './types/cart'
import type { Menu } from './types/menu'

type Tab = 'build' | 'orders'

const TABS: { id: Tab; label: string }[] = [
  { id: 'build', label: 'Build' },
  { id: 'orders', label: 'Orders' },
]

// Everything that depends on the server's data. App gives it a new `key`
// after "Reset demo data", so every hook inside starts over.
function Shop({ menu }: { menu: Menu }) {
  const [tab, setTab] = useState<Tab>('build')
  const cart = useCart()
  // The cart item open in the builder. A snapshot from the moment Edit was
  // clicked: its itemVersion lets the server spot a change from another tab.
  const [editing, setEditing] = useState<CartItemView | null>(null)
  // If the item left the cart (removed here or in another tab), stop editing it.
  const editingItem = editing && cart.cart?.items.some((item) => item.id === editing.id) ? editing : null

  function finishEdit(): void {
    setEditing(null)
    cart.refresh()
  }

  const activeLines = cart.totals?.lines.length ?? 0

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col px-4 sm:px-6 lg:h-full">
      <nav aria-label="Pages" className="shrink-0 py-4">
        <div className="inline-flex rounded-xl bg-line p-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={tab === id}
              className={`rounded-lg px-5 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary ${tab === id ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Hidden, not removed: a half-built item survives a look at the Orders tab.
          On large screens each column scrolls on its own, so the cart stays in view. */}
      <div
        hidden={tab !== 'build'}
        className="grid gap-6 pb-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_24rem] lg:pb-0"
      >
        <div className="lg:overflow-y-auto lg:pr-2 lg:pb-6">
          <Builder
            key={editingItem?.id ?? 'new'}
            menu={menu}
            onAdded={cart.refresh}
            cartVersion={cart.cart?.version}
            editing={editingItem}
            onEditDone={finishEdit}
          />
        </div>
        <div id="cart" className="scroll-mt-4 lg:overflow-y-auto lg:pb-6">
          <CartPanel menu={menu} cart={cart} editingId={editingItem?.id ?? null} onEdit={setEditing} />
        </div>
      </div>

      {/* Phones: the cart is far below the menu, so keep a shortcut to it on screen. */}
      {tab === 'build' && activeLines > 0 && cart.totals && (
        <div className="sticky bottom-0 -mx-4 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
          <a
            href="#cart"
            className="flex h-11 items-center justify-between rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm"
          >
            <span>
              View cart · {activeLines} {activeLines === 1 ? 'item' : 'items'}
            </span>
            <span className="tabular-nums">BDT {formatBdt(cart.totals.payable)}</span>
          </a>
        </div>
      )}

      {/* Mounted only while open: it asks for fresh orders each time. */}
      {tab === 'orders' && (
        <div className="pb-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          <OrdersPanel menu={menu} />
        </div>
      )}
    </div>
  )
}

function App() {
  const { menu, error, reload } = useMenu()
  const [resetCount, setResetCount] = useState(0)

  return (
    // Full screen: header and footer stay put, only the middle scrolls.
    <div className="flex h-dvh flex-col bg-page text-ink">
      <header className="shrink-0 border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <span aria-hidden="true" className="h-8 w-8 rounded-lg bg-yolk shadow-sm" />
          <h1 className="text-lg font-bold tracking-tight sm:text-xl">Smart Order Builder</h1>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto lg:overflow-hidden">
        {error && (
          <div role="alert" className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-6 text-red-700 sm:px-6">
            <span>{error}</span>
            <button type="button" className={btnDanger} onClick={reload}>
              Try again
            </button>
          </div>
        )}
        {!menu && !error && <p className="mx-auto max-w-7xl px-4 py-6 text-muted sm:px-6">Loading menu…</p>}
        {menu && <Shop key={resetCount} menu={menu} />}
      </main>

      <DevTools onReset={() => setResetCount((n) => n + 1)} />
    </div>
  )
}

export default App
