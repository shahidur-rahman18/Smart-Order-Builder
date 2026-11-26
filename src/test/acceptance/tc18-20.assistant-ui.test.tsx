import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import App from '../../App'
import { bestSellingOptions } from '../../assistant/stats'
import { ERROR_MESSAGES } from '../../assistant/errors'
import { server } from '../../mock/node'
import { configA } from '../builders'

// ---- A fake Gemini on the network (MSW) -------------------------------------
// It behaves like the real model is told to: pick a tool from the question,
// then phrase ONLY the tool result it gets back. So every number in the
// answer comes from our stats code, through the real tools.ts and gemini.ts.

interface GeminiPart {
  text?: string
  functionCall?: { name: string; args?: Record<string, unknown> }
  functionResponse?: { name: string; response: { result: unknown } }
}
interface GeminiRequest {
  contents: { role: string; parts: GeminiPart[] }[]
  tools: { functionDeclarations: { name: string }[] }[]
  systemInstruction: { parts: { text: string }[] }
}

const GEMINI_URL = /generativelanguage\.googleapis\.com/

function pickTool(question: string): string {
  if (/best customer/i.test(question)) return 'describeData'
  if (/best-selling/i.test(question)) return 'bestSellingOptions'
  return 'countOrders'
}

interface OptionUnitsLike {
  name: string
  units: number
}

function phrase(tool: string, result: unknown): string {
  if (tool === 'countOrders') return `There are ${(result as { count: number }).count} orders.`
  if (tool === 'bestSellingOptions') {
    const { options } = result as { options: OptionUnitsLike[] }
    return `Best seller: ${options.map((o) => `${o.name} (${o.units} units)`).join(', ')}.`
  }
  const { notInData } = result as { notInData: string[] }
  return `I can't know that: the order data does not contain ${notInData[0]}.`
}

const textReply = (text: string) => HttpResponse.json({ candidates: [{ content: { role: 'model', parts: [{ text }] } }] })

function useFakeGemini(): GeminiRequest[] {
  const requests: GeminiRequest[] = []
  server.use(
    http.post(GEMINI_URL, async ({ request }) => {
      const body = (await request.json()) as GeminiRequest
      requests.push(body)
      const last = body.contents[body.contents.length - 1]
      const toolAnswer = last.parts.find((part) => part.functionResponse)?.functionResponse
      if (toolAnswer) return textReply(phrase(toolAnswer.name, toolAnswer.response.result))

      const question = last.parts[0].text ?? ''
      return HttpResponse.json({
        candidates: [{ content: { role: 'model', parts: [{ functionCall: { name: pickTool(question), args: {} } }] } }],
      })
    }),
  )
  return requests
}

// ---- helpers ------------------------------------------------------------------

async function openAssistant() {
  const user = userEvent.setup()
  render(<App />)
  // The tabs appear once the menu has loaded; before that the assistant button is disabled.
  await screen.findByRole('button', { name: 'Orders' })
  await user.click(screen.getByRole('button', { name: 'Sales assistant' }))
  return user
}

async function ask(user: ReturnType<typeof userEvent.setup>, question: string) {
  const box = screen.getByLabelText('Ask a question')
  await user.clear(box)
  await user.type(box, question)
  await user.click(screen.getByRole('button', { name: 'Send' }))
}

const conversation = () => screen.getByRole('log', { name: 'Conversation' })

async function checkoutOne(key: string, quantity = 1) {
  const added = await api.addItem({ idempotencyKey: `${key}-add`, config: configA(), quantity })
  await api.checkout({ idempotencyKey: `${key}-pay`, paymentMethod: 'cash', cartVersion: added.cart.version })
}

describe('Sales assistant (Part F)', { timeout: 15_000 }, () => {
  beforeEach(() => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('TC-18: "How many orders?" before and after one checkout differ by exactly one, no reload', async () => {
    useFakeGemini()
    const user = await openAssistant()

    await ask(user, 'How many orders?')
    expect(await within(conversation()).findByText('There are 6 orders.')).toBeInTheDocument()

    await checkoutOne('tc18')

    await ask(user, 'How many orders?')
    expect(await within(conversation()).findByText('There are 7 orders.')).toBeInTheDocument()
    expect(within(conversation()).getAllByText('via countOrders')).toHaveLength(2)
  })

  it('TC-19: best-selling answer = stats function, and follows changed data', async () => {
    useFakeGemini()
    const user = await openAssistant()

    const expected = async () => {
      const [{ orders }, { menu }] = await Promise.all([api.getOrders(), api.getMenu()])
      return phrase('bestSellingOptions', bestSellingOptions(orders, menu))
    }

    const before = await expected()
    await user.click(screen.getByRole('button', { name: 'What is the best-selling option?' }))
    expect(await within(conversation()).findByText(before)).toBeInTheDocument()

    // Change the data: 3 × item A adds 6 Scrambled, which overtakes Fried.
    await checkoutOne('tc19', 3)
    const after = await expected()
    expect(after).not.toBe(before)

    await user.click(screen.getByRole('button', { name: 'What is the best-selling option?' }))
    expect(await within(conversation()).findByText(after)).toBeInTheDocument()
  })

  it('TC-20: "Who is our best customer?" → says the data cannot tell, no name invented', async () => {
    const requests = useFakeGemini()
    const user = await openAssistant()

    await ask(user, 'Who is our best customer?')
    const answer = await within(conversation()).findByText(/order data does not contain customer/i)
    expect(answer).toBeInTheDocument()

    // Nothing to invent a name from: no customer tool, and the prompt forbids it.
    const toolNames = requests[0].tools[0].functionDeclarations.map((tool) => tool.name)
    expect(toolNames.some((name) => /customer/i.test(name))).toBe(false)
    expect(requests[0].systemInstruction.parts[0].text).toMatch(/never invent/i)
  })

  it('raw orders are never sent to Gemini', async () => {
    const requests = useFakeGemini()
    const user = await openAssistant()
    await ask(user, 'What is the best-selling option?')
    await within(conversation()).findByText(/Best seller/)

    for (const body of requests) {
      expect(JSON.stringify(body)).not.toMatch(/"lines"|"config"|"payableExact"|ORD-1001/)
    }
  })
})

describe('Sales assistant error messages', { timeout: 15_000 }, () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('missing key: clear message and Send is disabled with the reason', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', '')
    await openAssistant()

    expect(screen.getByRole('alert')).toHaveTextContent(ERROR_MESSAGES.missing_key)
    const send = screen.getByRole('button', { name: 'Send' })
    expect(send).toBeDisabled()
    expect(send).toHaveAttribute('title', ERROR_MESSAGES.missing_key)
  })

  it.each([
    ['invalid key', 400, { error: { code: 400, message: 'API key not valid.', details: [{ reason: 'API_KEY_INVALID' }] } }, ERROR_MESSAGES.invalid_key],
    ['quota', 429, { error: { code: 429, status: 'RESOURCE_EXHAUSTED' } }, ERROR_MESSAGES.quota],
  ])('%s → its own message', async (_name, status, body, message) => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key')
    server.use(http.post(GEMINI_URL, () => HttpResponse.json(body, { status })))
    const user = await openAssistant()

    await ask(user, 'How many orders?')
    expect(await within(conversation()).findByText(message)).toBeInTheDocument()
  })

  it('network error → its own message', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key')
    server.use(http.post(GEMINI_URL, () => HttpResponse.error()))
    const user = await openAssistant()

    await ask(user, 'How many orders?')
    expect(await within(conversation()).findByText(ERROR_MESSAGES.network)).toBeInTheDocument()
  })
})
