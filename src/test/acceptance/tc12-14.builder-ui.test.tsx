import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { api } from '../../api/client'
import { Builder } from '../../components/builder/Builder'
import { priceUnit } from '../../engine/pricing'
import { formatBdt } from '../../engine/money'
import { menu } from '../../fixtures'
import { parsePrice } from '../../mock/parse'
import { server } from '../../mock/node'
import { failNextReserve } from '../../server/chaos'
import { pricePreview } from '../../server/price'
import { configByNames } from '../builders'

function bdt(poisha: number): string {
  return `BDT ${formatBdt(poisha)}`
}

function plus(name: string): HTMLElement {
  return screen.getByRole('button', { name: `Add one ${name}` })
}

function addButton(): HTMLElement {
  return screen.getByRole('button', { name: 'Add to cart' })
}

// Toast + 2 Scrambled + Chicken Sausage: a valid item (TC-01 "config A" minus the sauce).
async function buildValidItem(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(plus('Toast'))
  await user.click(plus('Scrambled'))
  await user.click(plus('Scrambled'))
  await user.click(plus('Chicken Sausage'))
}

// Waits until the stock numbers are on screen (the builder fetched /api/stock).
async function waitForStock(): Promise<void> {
  await screen.findAllByText(/left$/)
}

describe('Builder UI', () => {
  it('TC-01 (UI): Add is disabled and every violation is listed until the config is valid', async () => {
    const user = userEvent.setup()
    render(<Builder menu={menu} />)
    await waitForStock()

    expect(addButton()).toBeDisabled()
    const list = screen.getByRole('list', { name: 'Problems' })
    expect(list.querySelectorAll('li').length).toBeGreaterThanOrEqual(3) // bread, eggs, protein

    await buildValidItem(user)
    expect(screen.queryByRole('list', { name: 'Problems' })).not.toBeInTheDocument()
    expect(addButton()).toBeEnabled()
  })

  it('TC-12: first price answer is slower → only the second (latest) price is shown', async () => {
    const fastOption = Object.keys(configByNames({ Fried: 1 }))[0]
    // Answers for configs with Fried come fast; every other config comes slow.
    server.use(
      http.post('/api/price', async ({ request }) => {
        const body = parsePrice(await request.json())
        if (!body) return Response.json({}, { status: 400 })
        await delay(fastOption in body.config ? 20 : 700)
        const response = pricePreview(body)
        return Response.json(response.body, { status: response.status })
      }),
    )
    const user = userEvent.setup()
    render(<Builder menu={menu} />)

    await user.click(plus('Toast')) // config 1 → slow answer
    await new Promise((resolve) => setTimeout(resolve, 400)) // past the 300 ms debounce: request 1 is out
    await user.click(plus('Fried')) // config 2 → fast answer

    const second = priceUnit(configByNames({ Toast: 1, Fried: 1 }), menu).unitPrice
    const first = priceUnit(configByNames({ Toast: 1 }), menu).unitPrice
    expect(second).not.toBe(first)

    await waitFor(() => expect(screen.getByLabelText('Line total')).toHaveTextContent(bdt(second)))
    // Let the slow (stale) answer arrive: the screen must not jump back.
    await new Promise((resolve) => setTimeout(resolve, 900))
    expect(screen.getByLabelText('Line total')).toHaveTextContent(bdt(second))
  })

  it('TC-13: triple click on Add → one POST, one cart item', async () => {
    let posts = 0
    // Counts and falls through to the real handler (returning nothing = not handled here).
    server.use(
      http.post('/api/cart/items', () => {
        posts += 1
      }),
    )
    const user = userEvent.setup()
    render(<Builder menu={menu} />)
    await waitForStock()
    await buildValidItem(user)

    await user.tripleClick(addButton())
    await screen.findByText('Added to cart.')

    expect(posts).toBe(1)
    const { cart } = await api.getCart()
    expect(cart.items).toHaveLength(1)
  })

  it('TC-14: reserve fails (503) → selection stays on screen, Retry adds the item', async () => {
    const user = userEvent.setup()
    render(<Builder menu={menu} />)
    await waitForStock()
    await buildValidItem(user)

    failNextReserve()
    await user.click(addButton())
    await screen.findByText(/Could not reserve/)

    // The choices are still there.
    expect(screen.getByLabelText('Scrambled quantity')).toHaveTextContent('2')
    expect(screen.getByLabelText('Toast quantity')).toHaveTextContent('1')
    expect((await api.getCart()).cart.items).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    await screen.findByText('Added to cart.')
    expect((await api.getCart()).cart.items).toHaveLength(1)
  })
})
