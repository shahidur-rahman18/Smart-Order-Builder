// Asks Gemini with function calling (plain fetch, no SDK).
// Gemini never sees the orders: it only picks a tool, we run it here,
// send back the small result, and Gemini turns it into a sentence.
import { BUSY_RETRY_DELAY_MS, GEMINI_BASE_URL, GEMINI_MODEL, MAX_TOOL_ROUNDS, REQUEST_TIMEOUT_MS } from './config'
import { AssistantError, errorFromStatus } from './errors'
import { buildSystemPrompt } from './systemPrompt'
import { runTool as runToolDefault, toolDeclarations } from './tools'

// A part is kept exactly as Gemini sent it, so extra fields
// (like a thought signature) go back to Gemini unchanged.
type Part = Record<string, unknown>
interface Content {
  role: 'user' | 'model'
  parts: Part[]
}

export interface ChatTurn {
  role: 'user' | 'model'
  text: string
}

export type FetchFn = (url: string, init: RequestInit) => Promise<Response>
export type RunTool = (name: string, args: Record<string, unknown>) => Promise<unknown>

export interface AskOptions {
  apiKey: string | null
  today: string // "YYYY-MM-DD" in the shop time zone, from serverNow()
  timeZone: string
  history?: ChatTurn[] // earlier messages, text only
  fetchFn?: FetchFn // tests pass a fake
  runTool?: RunTool // tests may pass a fake
  busyRetryDelayMs?: number // tests pass 0
}

export interface Answer {
  text: string
  toolsUsed: string[] // shown small under the answer, e.g. "via countOrders"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// candidates[0].content.parts, or [] if the reply has another shape.
function partsOf(body: unknown): Part[] {
  if (!isRecord(body) || !Array.isArray(body.candidates)) return []
  const [first] = body.candidates
  if (!isRecord(first) || !isRecord(first.content) || !Array.isArray(first.content.parts)) return []
  return first.content.parts.filter(isRecord)
}

interface FunctionCall {
  name: string
  args: Record<string, unknown>
  id?: string // newer models number each call; the answer must carry the same id
}

function functionCallOf(part: Part): FunctionCall | null {
  const call = part.functionCall
  if (!isRecord(call) || typeof call.name !== 'string') return null
  const args = isRecord(call.args) ? call.args : {}
  return typeof call.id === 'string' ? { name: call.name, args, id: call.id } : { name: call.name, args }
}

function textOf(parts: Part[]): string {
  return parts
    .filter((part) => part.thought !== true)
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim()
}

const defaultFetch: FetchFn = (url, init) => fetch(url, init)

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// One HTTP call with a time limit, so a stuck request can never hang the chat.
async function postOnce(fetchFn: FetchFn, url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetchFn(url, { ...init, signal: controller.signal })
  } catch {
    // Our own time limit ran out: Gemini is reachable but too slow, not offline.
    if (controller.signal.aborted) throw new AssistantError('busy', 'Gemini timed out')
    throw new AssistantError('network')
  } finally {
    clearTimeout(timer)
  }
}

// One request to Gemini. Every failure becomes an AssistantError with a kind.
async function callGemini(contents: Content[], apiKey: string, options: AskOptions): Promise<Part[]> {
  const fetchFn = options.fetchFn ?? defaultFetch
  const body = {
    systemInstruction: { parts: [{ text: buildSystemPrompt(options.today, options.timeZone) }] },
    contents,
    tools: [{ functionDeclarations: toolDeclarations }],
  }

  const url = `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent`
  const init: RequestInit = {
    method: 'POST',
    // Key in a header, not in the URL, so it does not end up in logs or history.
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  }

  let response = await postOnce(fetchFn, url, init)
  // 503 = "high demand right now". It usually passes in a second, so try once more.
  if (response.status === 503) {
    await wait(options.busyRetryDelayMs ?? BUSY_RETRY_DELAY_MS)
    response = await postOnce(fetchFn, url, init)
  }

  const json: unknown = await response.json().catch(() => null)
  if (!response.ok) throw errorFromStatus(response.status, json)
  return partsOf(json)
}

export async function askAssistant(question: string, options: AskOptions): Promise<Answer> {
  const { apiKey } = options
  if (!apiKey) throw new AssistantError('missing_key')
  const runTool = options.runTool ?? runToolDefault

  const contents: Content[] = [
    ...(options.history ?? []).map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
    { role: 'user', parts: [{ text: question }] },
  ]
  const toolsUsed: string[] = []

  // Round 0..MAX: each round Gemini either answers in text (done) or asks for tools.
  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const parts = await callGemini(contents, apiKey, options)
    const calls = parts.map(functionCallOf).filter((call) => call !== null)

    if (calls.length === 0) {
      const text = textOf(parts)
      if (!text) throw new AssistantError('other', 'Gemini returned no text')
      return { text, toolsUsed }
    }
    if (round === MAX_TOOL_ROUNDS) break

    contents.push({ role: 'model', parts })
    const responses: Part[] = []
    for (const call of calls) {
      const result = await runTool(call.name, call.args)
      toolsUsed.push(call.name)
      const id = call.id === undefined ? {} : { id: call.id }
      responses.push({ functionResponse: { name: call.name, ...id, response: { result } } })
    }
    contents.push({ role: 'user', parts: responses })
  }

  throw new AssistantError('other', `Gemini asked for tools more than ${MAX_TOOL_ROUNDS} times`)
}
