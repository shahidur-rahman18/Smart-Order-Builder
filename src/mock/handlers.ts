import { delay, http } from 'msw'
import { addItem, editItem, getCart, removeItem, setCoupon } from '../server/cart'
import { checkout, getOrders } from '../server/checkout'
import { serverNow } from '../server/clock'
import { getMenu } from '../server/menu'
import { pricePreview } from '../server/price'
import { getStock } from '../server/stockView'
import type { ErrorBody, ServerResponse } from '../types/api'
import { parseAddItem, parseCheckout, parseCoupon, parseEditItem, parsePrice } from './parse'

// MSW is only the "counter": it reads the request, calls the server function
// (which does all the real work in src/server) and sends its answer back.

// Fake network delay. Tests turn it off so they run fast and in a known order.
export const latency = { enabled: true }

const PRICE_DELAY_MS = { min: 200, max: 1500 } // SPEC Part C
const OTHER_DELAY_MS = { min: 100, max: 300 }

async function networkDelay(range: { min: number; max: number }): Promise<void> {
  if (!latency.enabled) return
  await delay(range.min + Math.random() * (range.max - range.min))
}

// Plain Response.json: MSW's HttpResponse would want our body types to be JSON-only
// types, which our interfaces are not. The result on the wire is the same.
function send<Body>(response: ServerResponse<Body>): Response {
  return Response.json(response.body, { status: response.status })
}

function badRequest(): Response {
  const body: ErrorBody = {
    code: 'BAD_REQUEST',
    message: 'The request body has the wrong shape.',
    serverTime: serverNow(),
  }
  return send({ status: 400, body })
}

// Broken JSON is treated like a wrong shape (→ 400), never a crash.
async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

export const handlers = [
  http.get('/api/menu', async () => {
    await networkDelay(OTHER_DELAY_MS)
    return send(getMenu())
  }),

  http.get('/api/stock', async () => {
    await networkDelay(OTHER_DELAY_MS)
    return send(getStock())
  }),

  http.post('/api/price', async ({ request }) => {
    const body = parsePrice(await readJson(request))
    await networkDelay(PRICE_DELAY_MS)
    return body ? send(pricePreview(body)) : badRequest()
  }),

  http.get('/api/cart', async () => {
    await networkDelay(OTHER_DELAY_MS)
    return send(getCart())
  }),

  http.post('/api/cart/items', async ({ request }) => {
    const body = parseAddItem(await readJson(request))
    await networkDelay(OTHER_DELAY_MS)
    return body ? send(addItem(body)) : badRequest()
  }),

  http.put<{ id: string }>('/api/cart/items/:id', async ({ request, params }) => {
    const body = parseEditItem(await readJson(request))
    await networkDelay(OTHER_DELAY_MS)
    return body ? send(editItem(params.id, body)) : badRequest()
  }),

  http.delete<{ id: string }>('/api/cart/items/:id', async ({ params }) => {
    await networkDelay(OTHER_DELAY_MS)
    return send(removeItem(params.id))
  }),

  http.put('/api/cart/coupon', async ({ request }) => {
    const body = parseCoupon(await readJson(request))
    await networkDelay(OTHER_DELAY_MS)
    return body ? send(setCoupon(body.code)) : badRequest()
  }),

  http.post('/api/checkout', async ({ request }) => {
    const body = parseCheckout(await readJson(request))
    await networkDelay(OTHER_DELAY_MS)
    return body ? send(checkout(body)) : badRequest()
  }),

  http.get('/api/orders', async () => {
    await networkDelay(OTHER_DELAY_MS)
    return send(getOrders())
  }),
]
