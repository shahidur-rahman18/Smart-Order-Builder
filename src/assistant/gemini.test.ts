import { describe, expect, it, vi } from 'vitest'
import { askAssistant, type AskOptions } from './gemini'
import { ERROR_MESSAGES, AssistantError } from './errors'
import { GEMINI_MODEL, REQUEST_TIMEOUT_MS } from './config'
import { runTool as realRunTool } from './tools'

// A fake Gemini: each call returns the next prepared reply and records the request.
function fakeGemini(replies: { status?: number; body: unknown }[]) {
  const requests: { url: string; init: RequestInit }[] = []
  const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(url), init: init ?? {} })
    const reply = replies[requests.length - 1]
    if (!reply) throw new Error('Gemini was called more times than expected')
    return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200 })
  })
  return { fetchFn, requests, bodyOf: (i: number) => JSON.parse(String(requests[i].init.body)) as unknown }
}

const functionCall = (name: string, args: Record<string, unknown> = {}) => ({
  candidates: [{ content: { role: 'model', parts: [{ functionCall: { name, args } }] } }],
})
const textReply = (text: string) => ({ candidates: [{ content: { role: 'model', parts: [{ text }] } }] })

function options(overrides: Partial<AskOptions>): AskOptions {
  return {
    apiKey: 'test-key',
    today: '2026-11-26',
    timeZone: 'Asia/Dhaka',
    runTool: async () => ({ count: 6 }),
    busyRetryDelayMs: 0,
    ...overrides,
  }
}

async function errorKind(promise: Promise<unknown>) {
  try {
    await promise
  } catch (error) {
    if (error instanceof AssistantError) return error.kind
    throw error
  }
  throw new Error('expected an AssistantError')
}

describe('askAssistant: function-calling loop', () => {
  it('runs the tool locally and lets Gemini only phrase the result', async () => {
    const gemini = fakeGemini([{ body: functionCall('countOrders') }, { body: textReply('There are 6 orders.') }])
    const runTool = vi.fn(async () => ({ count: 6 }))

    const answer = await askAssistant('How many orders?', options({ fetchFn: gemini.fetchFn, runTool }))

    expect(answer).toEqual({ text: 'There are 6 orders.', toolsUsed: ['countOrders'] })
    expect(runTool).toHaveBeenCalledWith('countOrders', {})

    // Second request carries our tool result back to Gemini.
    const second = JSON.stringify(gemini.bodyOf(1))
    expect(second).toContain('"functionResponse"')
    expect(second).toContain('"count":6')
  })

  it('sends back the call id when Gemini gives one', async () => {
    const withId = { candidates: [{ content: { role: 'model', parts: [{ functionCall: { name: 'countOrders', args: {}, id: 'call_1' }, thoughtSignature: 'sig' }] } }] }
    const gemini = fakeGemini([{ body: withId }, { body: textReply('6') }])
    await askAssistant('How many orders?', options({ fetchFn: gemini.fetchFn }))

    const second = JSON.stringify(gemini.bodyOf(1))
    expect(second).toContain('"functionResponse":{"name":"countOrders","id":"call_1"')
    expect(second).toContain('"thoughtSignature":"sig"') // the model part goes back unchanged
  })

  it('sends the model name in the URL and the key in a header, not in the URL', async () => {
    const gemini = fakeGemini([{ body: textReply('Hi') }])
    await askAssistant('hello', options({ fetchFn: gemini.fetchFn }))

    const { url, init } = gemini.requests[0]
    expect(url).toContain(`/models/${GEMINI_MODEL}:generateContent`)
    expect(url).not.toContain('test-key')
    expect(new Headers(init.headers).get('x-goog-api-key')).toBe('test-key')
  })

  it('declares the tools and a system prompt on every request', async () => {
    const gemini = fakeGemini([{ body: textReply('Hi') }])
    await askAssistant('hello', options({ fetchFn: gemini.fetchFn }))

    const body = JSON.stringify(gemini.bodyOf(0))
    expect(body).toContain('"functionDeclarations"')
    expect(body).toContain('"systemInstruction"')
    expect(body).toContain('2026-11-26')
  })

  it('never sends raw orders to Gemini', async () => {
    // Real tool: it loads the real orders from the mock server, but only its small result goes out.
    const gemini = fakeGemini([{ body: functionCall('bestSellingOptions') }, { body: textReply('Fried') }])
    await askAssistant('Best seller?', options({ fetchFn: gemini.fetchFn, runTool: realRunTool }))

    expect(JSON.stringify(gemini.bodyOf(1))).toContain('"units":10')

    for (let i = 0; i < gemini.requests.length; i++) {
      const body = JSON.stringify(gemini.bodyOf(i))
      expect(body).not.toContain('ORD-1001')
      expect(body).not.toMatch(/"lines"|"config"|"payableExact"/)
    }
  })

  it('stops after too many tool rounds instead of looping forever', async () => {
    const gemini = fakeGemini([
      { body: functionCall('countOrders') },
      { body: functionCall('countOrders') },
      { body: functionCall('countOrders') },
      { body: functionCall('countOrders') },
    ])
    expect(await errorKind(askAssistant('loop', options({ fetchFn: gemini.fetchFn })))).toBe('other')
  })
})

describe('askAssistant: the four error messages', () => {
  it('missing key → no request at all', async () => {
    const gemini = fakeGemini([])
    expect(await errorKind(askAssistant('hi', options({ apiKey: null, fetchFn: gemini.fetchFn })))).toBe('missing_key')
    expect(gemini.fetchFn).not.toHaveBeenCalled()
    expect(ERROR_MESSAGES.missing_key).toContain('VITE_GEMINI_API_KEY')
  })

  it('400 API_KEY_INVALID → invalid key', async () => {
    const gemini = fakeGemini([
      {
        status: 400,
        body: {
          error: {
            code: 400,
            message: 'API key not valid. Please pass a valid API key.',
            status: 'INVALID_ARGUMENT',
            details: [{ reason: 'API_KEY_INVALID' }],
          },
        },
      },
    ])
    expect(await errorKind(askAssistant('hi', options({ fetchFn: gemini.fetchFn })))).toBe('invalid_key')
  })

  it('403 → invalid key', async () => {
    const gemini = fakeGemini([{ status: 403, body: { error: { code: 403, status: 'PERMISSION_DENIED' } } }])
    expect(await errorKind(askAssistant('hi', options({ fetchFn: gemini.fetchFn })))).toBe('invalid_key')
  })

  it('429 → quota', async () => {
    const gemini = fakeGemini([{ status: 429, body: { error: { code: 429, status: 'RESOURCE_EXHAUSTED' } } }])
    expect(await errorKind(askAssistant('hi', options({ fetchFn: gemini.fetchFn })))).toBe('quota')
  })

  it('503 once → tries again and answers', async () => {
    const busy = { status: 503, body: { error: { code: 503, status: 'UNAVAILABLE' } } }
    const gemini = fakeGemini([busy, { body: textReply('Hi') }])
    expect(await askAssistant('hi', options({ fetchFn: gemini.fetchFn }))).toEqual({ text: 'Hi', toolsUsed: [] })
    expect(gemini.fetchFn).toHaveBeenCalledTimes(2)
  })

  it('503 twice → busy', async () => {
    const busy = { status: 503, body: { error: { code: 503, status: 'UNAVAILABLE' } } }
    const gemini = fakeGemini([busy, busy])
    expect(await errorKind(askAssistant('hi', options({ fetchFn: gemini.fetchFn })))).toBe('busy')
  })

  it('a request that takes too long → busy, not a hang', async () => {
    vi.useFakeTimers()
    try {
      // Never answers; only gives up when our time limit aborts it.
      const fetchFn = vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(new Error('aborted')))
          }),
      )
      const result = errorKind(askAssistant('hi', options({ fetchFn })))
      await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 1)
      expect(await result).toBe('busy')
    } finally {
      vi.useRealTimers()
    }
  })

  it('fetch throws (offline) → network', async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    expect(await errorKind(askAssistant('hi', options({ fetchFn })))).toBe('network')
  })

  it('a 400 that is not about the key is not called "invalid key"', async () => {
    const gemini = fakeGemini([{ status: 400, body: { error: { code: 400, message: 'Bad schema' } } }])
    expect(await errorKind(askAssistant('hi', options({ fetchFn: gemini.fetchFn })))).toBe('other')
  })

  it('every kind has a clear message', () => {
    expect(Object.keys(ERROR_MESSAGES).sort()).toEqual(['busy', 'invalid_key', 'missing_key', 'network', 'other', 'quota'])
  })
})
