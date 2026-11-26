import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import App from '../../App'
import { ordersToJson } from '../../engine/ordersJson'
import { seed } from '../../fixtures'
import { configA, configB } from '../builders'

function ordersTable(): HTMLElement {
  return screen.getByRole('table', { name: 'Orders' })
}

async function placeOrder(key: string): Promise<string> {
  const added = await api.addItem({ idempotencyKey: `${key}-add`, config: configB(), quantity: 1 })
  return (await api.checkout({ idempotencyKey: `${key}-pay`, paymentMethod: 'card', cartVersion: added.cart.version })).order.id
}

// The whole App with many clicks: slower when all test files run in parallel.
describe('Orders tab and Dev tools', { timeout: 15_000 }, () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('TC-17 (UI): seed + new orders listed, still there after a refresh, Download gives the stored JSON', async () => {
    const newId = await placeOrder('tc17')
    const user = userEvent.setup()
    const first = render(<App />)

    await user.click(await screen.findByRole('button', { name: 'Orders' }))
    await within(ordersTable()).findByText(newId)
    // seed orders + the new one (header row not counted)
    expect(within(ordersTable()).getAllByRole('row')).toHaveLength(seed.orders.length + 2)

    // "Refresh": a brand-new App reads the same localStorage.
    first.unmount()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Orders' }))
    expect(await within(ordersTable()).findByText(newId)).toBeInTheDocument()

    // jsdom has no real downloads: catch the Blob the button makes.
    const blobs: Blob[] = []
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobs.push(blob)
      return 'blob:orders'
    })
    URL.revokeObjectURL = vi.fn()
    const clicked = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await user.click(screen.getByRole('button', { name: 'Download orders.json' }))
    await waitFor(() => expect(clicked).toHaveBeenCalled())

    const { orders } = await api.getOrders()
    expect(blobs).toHaveLength(1)
    expect(await blobs[0].text()).toBe(ordersToJson(orders))
  })

  it('Dev tools: "Fail next reserve" makes the next Add fail once; "Reset demo data" empties cart and new orders', async () => {
    await placeOrder('dev')
    await api.addItem({ idempotencyKey: 'dev-cart', config: configA(), quantity: 1 })
    const user = userEvent.setup()
    render(<App />)
    await screen.findByRole('listitem', { name: 'Cart item 1' })

    await user.click(screen.getByRole('button', { name: 'Fail next reserve' }))
    expect(await screen.findByText('The next reserve will fail once.')).toBeInTheDocument()
    await expect(api.addItem({ idempotencyKey: 'dev-fail', config: configA(), quantity: 1 })).rejects.toMatchObject({
      status: 503,
    })

    await user.click(screen.getByRole('button', { name: 'Reset demo data' }))
    expect(await screen.findByText('Your cart is empty.')).toBeInTheDocument()
    const { orders } = await api.getOrders()
    expect(orders).toHaveLength(seed.orders.length)
    expect(orders.every((order) => order.source === 'seed')).toBe(true)
  })
})
