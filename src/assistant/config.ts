// Gemini settings in one place.

// A Flash model that works with a new free key and supports function calling.
// Checked on 26 Nov 2026 with a real key:
// - gemini-2.5-flash: closed to new keys (404)
// - gemini-3.5-flash: free tier allows only 20 requests a day (one question = 2 requests)
// - gemini-3.5-flash-lite: works, answers in about a second → we use it.
export const GEMINI_MODEL = 'gemini-3.5-flash-lite'

export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

// The model may ask for a tool, get the result, and ask again. After this many
// rounds we stop, so a confused model can never loop forever.
export const MAX_TOOL_ROUNDS = 3

// One Gemini request may take this long before we give up (the model "thinks" first).
export const REQUEST_TIMEOUT_MS = 30_000

// After a 503 ("high demand") we wait this long and try once more.
export const BUSY_RETRY_DELAY_MS = 1_500

// The key from .env.local, or null if it is missing or empty.
export function readApiKey(): string | null {
  const key = import.meta.env.VITE_GEMINI_API_KEY?.trim()
  return key ? key : null
}
