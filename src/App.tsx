import { useState } from 'react'
import { FloatingAssistant } from './components/assistant/FloatingAssistant'
import { Builder } from './components/builder/Builder'
import { CartPanel } from './components/cart/CartPanel'
import { DevTools } from './components/DevTools'
import { Header, type Tab } from './components/Header'
import { OrdersPanel } from './components/orders/OrdersPanel'
import { btnDanger } from './components/ui'
import { clearDraft } from './hooks/draftStorage'
import { useCart } from './hooks/useCart'
import { useMenu } from './hooks/useMenu'
import type { CartItemView } from './types/cart'
import type { Menu } from './types/menu'

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
      <Header tab={tab} onTab={setTab} timeZone={menu.shop.timeZone} cartCount={cart.cart?.items.length ?? 0} />

      <main className="flex-1 lg:min-h-0 lg:overflow-hidden">
        {/* Hidden, not removed: a half-built item survives a look at the Orders tab.
            On large screens each column scrolls on its own, so the cart stays in view. */}
        <div
          hidden={tab !== 'build'}
          className="mx-auto grid w-full max-w-screen-2xl grid-cols-1 gap-4 lg:grid-rows-[minmax(0,1fr)] px-4 pt-4 sm:px-6 lg:h-full lg:grid-cols-[minmax(0,1fr)_19rem] lg:py-2.5 xl:grid-cols-[minmax(0,1fr)_21rem] 2xl:grid-cols-[minmax(0,1fr)_23rem]"
        >
          {/* Each column fits the screen; only a very short screen would make it scroll. */}
          <div className="lg:min-h-0 lg:overflow-y-auto">
            <Builder
              key={editingItem?.id ?? 'new'}
              menu={menu}
              onAdded={cart.refresh}
              cartVersion={cart.cart?.version}
              editing={editingItem}
              onEditDone={finishEdit}
              onEditFailed={cart.refresh}
            />
          </div>
          <div id="cart" className="scroll-mt-32 pb-6 sm:scroll-mt-20 lg:min-h-0 lg:overflow-y-auto lg:pb-0">
            <CartPanel menu={menu} cart={cart} editingId={editingItem?.id ?? null} onEdit={setEditing} />
          </div>
        </div>

        {/* Mounted only while open: it asks for fresh orders each time. */}
        {tab === 'orders' && (
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:h-full lg:overflow-y-auto">
            <OrdersPanel menu={menu} />
          </div>
        )}
      </main>

      {/* Floats over every page, so the chat is one click away from anywhere. */}
      <FloatingAssistant timeZone={menu.shop.timeZone} />
    </>
  )
}

function App() {
  const { menu, error, reload } = useMenu()
  const [resetCount, setResetCount] = useState(0)

  return (
    // Phones and tablets: the page scrolls normally (header sticks on top).
    // Desktop: full screen, header and footer stay put, only the middle scrolls.
    <div className="flex min-h-dvh flex-col bg-page text-ink lg:h-dvh">
      {menu ? (
        <Shop key={resetCount} menu={menu} />
      ) : (
        <>
          <Header />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
            {error ? (
              <div role="alert" className="flex flex-wrap items-center gap-3 text-red-700">
                <span>{error}</span>
                <button type="button" className={btnDanger} onClick={reload}>
                  Try again
                </button>
              </div>
            ) : (
              <p className="text-muted">Loading menu…</p>
            )}
          </main>
        </>
      )}

      <DevTools
        onReset={() => {
          clearDraft() // "start again" means the half-built item too
          setResetCount((n) => n + 1)
        }}
      />
    </div>
  )
}

export default App
