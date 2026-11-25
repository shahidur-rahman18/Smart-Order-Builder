import { useState } from 'react'
import { Builder } from './components/builder/Builder'
import { CartPanel } from './components/cart/CartPanel'
import { DevTools } from './components/DevTools'
import { OrdersPanel } from './components/orders/OrdersPanel'
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

  return (
    <>
      <nav aria-label="Pages" className="mb-6 flex gap-2">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            className={`rounded px-4 py-2 text-sm font-medium ${tab === id ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700'}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Hidden, not removed: a half-built item survives a look at the Orders tab. */}
      <div hidden={tab !== 'build'} className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <Builder
          key={editingItem?.id ?? 'new'}
          menu={menu}
          onAdded={cart.refresh}
          cartVersion={cart.cart?.version}
          editing={editingItem}
          onEditDone={finishEdit}
        />
        <CartPanel menu={menu} cart={cart} editingId={editingItem?.id ?? null} onEdit={setEditing} />
      </div>

      {/* Mounted only while open: it asks for fresh orders each time. */}
      {tab === 'orders' && <OrdersPanel menu={menu} />}
    </>
  )
}

function App() {
  const { menu, error, reload } = useMenu()
  const [resetCount, setResetCount] = useState(0)

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <h1 className="text-xl font-semibold sm:text-2xl">Smart Order Builder</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {error && (
          <div role="alert" className="flex items-center gap-3 text-red-700">
            <span>{error}</span>
            <button type="button" className="rounded border border-red-300 px-3 py-1" onClick={reload}>
              Try again
            </button>
          </div>
        )}
        {!menu && !error && <p className="text-slate-500">Loading menu…</p>}
        {menu && <Shop key={resetCount} menu={menu} />}
      </main>

      <DevTools onReset={() => setResetCount((n) => n + 1)} />
    </div>
  )
}

export default App
