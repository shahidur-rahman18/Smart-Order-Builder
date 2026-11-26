// Turns every way the Gemini call can fail into one of a few clear messages.

export type AssistantErrorKind = 'missing_key' | 'invalid_key' | 'quota' | 'network' | 'busy' | 'other'

export const ERROR_MESSAGES: Record<AssistantErrorKind, string> = {
  missing_key: 'Gemini key missing: add VITE_GEMINI_API_KEY to .env.local and restart `npm run dev`.',
  invalid_key: 'Gemini key is invalid. Check VITE_GEMINI_API_KEY in .env.local.',
  quota:
    'Gemini free quota reached. Wait a minute and try again. If it keeps happening, the daily free limit is used up: try again tomorrow.',
  network: 'Network error: could not reach Gemini. Check your internet connection.',
  busy: 'Gemini is busy right now (high demand). Please try again in a moment.',
  other: 'The assistant could not answer right now. Please try again.',
}

export class AssistantError extends Error {
  readonly kind: AssistantErrorKind

  // `detail` is for the developer console only; the user sees ERROR_MESSAGES[kind].
  constructor(kind: AssistantErrorKind, detail?: string) {
    super(detail ?? ERROR_MESSAGES[kind])
    this.kind = kind
  }
}

// Gemini says "bad key" as 400 + reason API_KEY_INVALID, or as 401/403.
// A 400 for any other reason (e.g. a bad request) must not be called a key problem.
function mentionsBadKey(body: unknown): boolean {
  const text = JSON.stringify(body ?? '')
  return text.includes('API_KEY_INVALID') || /api key not valid/i.test(text)
}

export function errorFromStatus(status: number, body: unknown): AssistantError {
  if (status === 401 || status === 403) return new AssistantError('invalid_key', `Gemini ${status}`)
  if (status === 400 && mentionsBadKey(body)) return new AssistantError('invalid_key', 'Gemini 400 API_KEY_INVALID')
  if (status === 429) return new AssistantError('quota', 'Gemini 429')
  if (status === 503) return new AssistantError('busy', 'Gemini 503')
  return new AssistantError('other', `Gemini ${status}: ${JSON.stringify(body)}`)
}

// The message to show for anything thrown while asking.
export function messageFor(error: unknown): string {
  return error instanceof AssistantError ? ERROR_MESSAGES[error.kind] : ERROR_MESSAGES.other
}
