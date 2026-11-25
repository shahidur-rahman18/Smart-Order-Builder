import type { ServerState } from './state'

export const STORAGE_KEY = 'sob:v1'

// A fresh object from localStorage on every call (JSON.parse builds a new one),
// so editing it never touches the saved copy until saveState().
// null = nothing saved yet, or the saved data is broken / from another version.
export function loadState(): ServerState | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return looksLikeState(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveState(state: ServerState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

// Shallow shape check: enough to reject broken or old data without crashing.
function looksLikeState(value: unknown): value is ServerState {
  if (typeof value !== 'object' || value === null) return false
  if (!('schemaVersion' in value) || value.schemaVersion !== 1) return false
  return 'cart' in value && 'orders' in value && 'idempotency' in value
}
