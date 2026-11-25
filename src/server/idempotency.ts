import type { SavedResponse, ServerState } from './state'

function storageKey(op: SavedResponse['op'], key: string): string {
  return `${op}:${key}`
}

// The response saved for this key, or null if this is the first time.
export function recall(state: ServerState, op: SavedResponse['op'], key: string): SavedResponse | null {
  return state.idempotency[storageKey(op, key)] ?? null
}

// Call only after success, on the same state copy that gets committed.
// Failures are never remembered, so a Retry with the same key can still work.
export function remember(state: ServerState, key: string, saved: SavedResponse, savedAt: number): void {
  state.idempotency[storageKey(saved.op, key)] = { ...saved, savedAt }
}
