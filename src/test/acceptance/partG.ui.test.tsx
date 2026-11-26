import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { api } from '../../api/client'
import App from '../../App'
import { Builder } from '../../components/builder/Builder'
import { CartPanel } from '../../components/cart/CartPanel'
import { menu } from '../../fixtures'
import { useCart } from '../../hooks/useCart'
import { DRAFT_KEY } from '../../hooks/draftStorage'
import { CONFLICT_MESSAGE } from '../../hooks/useDraftKey'
import { serverNow } from '../../server/clock'
import { withState } from '../../server/state'
import { configA, configB } from '../builders'

type User = ReturnType<typeof userEvent.setup>

function button(name: string | RegExp): HTMLElement {
  return screen.getByRole('button', { name })
}

function CartHarness() {
  const cart = useCart()
  return <CartPanel menu={menu} cart={cart} editingId={null} onEdit={() => {}} />
}

async function cartItems(count: number): Promise<HTMLElement[]> {
  await waitFor(() => expect(screen.getAllByRole('listitem', { name: /^Cart item/ })).toHaveLength(count))
  return screen.getAllByRole('listitem', { name: /^Cart item/ })
}

async function buildToastScrambled(user: User): Promise<void> {
  await screen.findAllByText(/left$/) // stock loaded
  await user.click(button('Add one Toast'))
  await user.click(button('Add one Scrambled'))
  await user.click(button('Add one Scrambled'))
  await user.click(button('Add one Chicken Sausage'))
}

describe('Part G (UI)', { timeout: 15_000 }, () => {
  describe('refresh keeps only still-valid reservations', () => {
    it('after a reload the cart comes from the server: expired shown as expired, active still counting', async () => {
      await api.addItem({ idempotencyKey: 'g-r-a', config: configA(), quantity: 1 })
      await api.addItem({ idempotencyKey: 'g-r-b', config: configB(), quantity: 1 })
      // While the page was closed, item 1's reservation ran out.
      withState((state) => {
        state.cart.items[0].expiresAt = serverNow() - 1000
        return { status: 200, body: null }
      })

      render(<CartHarness />) // a fresh page = a refresh
      const [first, second] = await cartItems(2)
      expect(within(first).getByText(/Reservation expired/)).toBeInTheDocument()
      expect(within(first).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
      expect(within(second).queryByText(/Reservation expired/)).not.toBeInTheDocument()
      expect(within(second).getByRole('button', { name: 'Edit' })).toBeInTheDocument()

      // Only the active item still holds stock.
      const stock = await api.getStock()
      const fresh = await api.getCart()
      expect(fresh.totals.lines.map((line) => line.id)).toEqual([fresh.cart.items[1].id])
      expect(Object.values(stock.reserved).some((n) => n > 0)).toBe(true)
    })
  })

  describe('cart versions: a stale tab gets a conflict and reloads', () => {
    it('coupon: another tab changed the cart → conflict message, cart reloaded, nothing overwritten', async () => {
      await api.addItem({ idempotencyKey: 'g-c-a', config: configA(), quantity: 1 })
      const user = userEvent.setup()
      render(<CartHarness />)
      await cartItems(1)

      // Tab B saves its own coupon first.
      const { cart } = await api.getCart()
      await api.setCoupon('OTHER-TAB', cart.version)

      await user.type(screen.getByLabelText('Coupon code'), 'MINE')
      await user.click(button('Apply'))

      expect(await screen.findByText(CONFLICT_MESSAGE)).toBeInTheDocument()
      expect((await api.getCart()).cart.couponCode).toBe('OTHER-TAB')
      await waitFor(() => expect(screen.getByLabelText('Coupon code')).toHaveValue('OTHER-TAB'))
    })

    it('pay: another tab added an item → conflict, no order; after the reload Pay works', async () => {
      await api.addItem({ idempotencyKey: 'g-p-a', config: configA(), quantity: 1 })
      const user = userEvent.setup()
      render(<CartHarness />)
      await cartItems(1)
      const ordersBefore = (await api.getOrders()).orders.length

      await api.addItem({ idempotencyKey: 'g-p-b', config: configB(), quantity: 1 }) // tab B

      await user.click(button(/^Pay/))
      expect(await screen.findByText(CONFLICT_MESSAGE)).toBeInTheDocument()
      expect((await api.getOrders()).orders).toHaveLength(ordersBefore)
      await cartItems(2) // the tab now shows what it would pay for

      await user.click(button(/^Pay/))
      expect(await screen.findByText(/^Order placed/)).toBeInTheDocument()
      expect((await api.getOrders()).orders).toHaveLength(ordersBefore + 1)
    })

    it('remove: another tab edited the item → conflict, item kept', async () => {
      const added = await api.addItem({ idempotencyKey: 'g-x-a', config: configA(), quantity: 1 })
      const user = userEvent.setup()
      render(<CartHarness />)
      const [item] = await cartItems(1)

      await api.editItem(added.item.id, {
        idempotencyKey: 'g-x-edit',
        config: configA(),
        quantity: 2,
        itemVersion: added.item.version,
      })

      await user.click(within(item).getByRole('button', { name: 'Remove' }))
      expect(await screen.findByText(CONFLICT_MESSAGE)).toBeInTheDocument()
      expect((await api.getCart()).cart.items).toHaveLength(1)
    })

    it('edit: another tab saved the item first → Save is blocked with the reason', async () => {
      const added = await api.addItem({ idempotencyKey: 'g-e-a', config: configA(), quantity: 1 })
      const user = userEvent.setup()
      render(<App />)
      const [item] = await cartItems(1)
      await user.click(within(item).getByRole('button', { name: 'Edit' }))
      await screen.findAllByText(/left$/)

      await api.editItem(added.item.id, {
        idempotencyKey: 'g-e-other',
        config: configA(),
        quantity: 2,
        itemVersion: added.item.version,
      })

      await user.click(button('Remove one Ketchup'))
      await user.click(button('Save changes'))

      expect(await screen.findByText(/changed in another tab\. Cancel the edit/)).toBeInTheDocument()
      expect(button('Save changes')).toBeDisabled()
      expect(button('Save changes')).toHaveAttribute('title', 'Changed in another tab')
      // The other tab's change is still there.
      expect((await api.getCart()).cart.items[0].quantity).toBe(2)
    })
  })

  describe('unfinished builder config survives a refresh', () => {
    it('choices and quantity come back after a reload; Add to cart clears the draft', async () => {
      const user = userEvent.setup()
      const first = render(<Builder menu={menu} />)
      await buildToastScrambled(user)
      await user.click(button(`Add one ${menu.product.name}`))
      first.unmount() // the page is closed

      render(<Builder menu={menu} />)
      expect(screen.getByLabelText('Toast quantity')).toHaveTextContent('1')
      expect(screen.getByLabelText('Scrambled quantity')).toHaveTextContent('2')
      expect(screen.getByLabelText('Quantity')).toHaveTextContent('2')

      await screen.findAllByText(/left$/)
      await user.click(button('Add to cart'))
      expect(await screen.findByText('Added to cart.')).toBeInTheDocument()
      expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
    })

    it('a draft that does not fit this menu is ignored (e.g. the menu changed)', () => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ config: { 'no-such-option': 1 }, quantity: 1 }))
      render(<Builder menu={menu} />)
      expect(screen.getByLabelText('Toast quantity')).toHaveTextContent('0')
      expect(localStorage.getItem(DRAFT_KEY)).toBeNull()
    })

    it('broken JSON in storage does not crash the builder', () => {
      localStorage.setItem(DRAFT_KEY, '{not json')
      render(<Builder menu={menu} />)
      expect(screen.getByLabelText('Toast quantity')).toHaveTextContent('0')
    })

    it('opening an edit and cancelling it brings the unfinished new item back', async () => {
      await api.addItem({ idempotencyKey: 'g-d-a', config: configB(), quantity: 1 })
      const user = userEvent.setup()
      render(<App />)
      await buildToastScrambled(user)

      const [item] = await cartItems(1)
      await user.click(within(item).getByRole('button', { name: 'Edit' }))
      await user.click(await screen.findByRole('button', { name: 'Cancel edit' }))

      await screen.findByRole('button', { name: 'Add to cart' })
      expect(screen.getByLabelText('Toast quantity')).toHaveTextContent('1')
      expect(screen.getByLabelText('Scrambled quantity')).toHaveTextContent('2')
    })
  })
})
