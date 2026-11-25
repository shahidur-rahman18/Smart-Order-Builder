import type { SavedResponse, ServerState } from './state'

type Op = SavedResponse['op']
type SavedFor<O extends Op> = Extract<SavedResponse, { op: O }>

function storageKey(op: Op, key: string): string {
  return `${op}:${key}`
}

function isFor<O extends Op>(saved: SavedResponse, op: O): saved is SavedFor<O> {
  return saved.op === op
}

// The response saved for this key, or null if this is the first time.
export function recall<O extends Op>(state: ServerState, op: O, key: string): SavedFor<O> | null {
  const saved = state.idempotency[storageKey(op, key)]
  return saved && isFor(saved, op) ? saved : null
}

// Call only after success, on the same state copy that gets committed.
// Failures are never remembered, so a Retry with the same key can still work.
export function remember(state: ServerState, key: string, saved: SavedResponse, savedAt: number): void {
  state.idempotency[storageKey(saved.op, key)] = { ...saved, savedAt }
}
