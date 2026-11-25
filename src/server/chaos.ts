// Failure injection, so we can show the app survives a bad network (TC-12, TC-14).
// This is a dev switch for this tab only, not shop data, so it is not kept in localStorage.
export interface Chaos {
  priceFailRate: number // 0…1, chance that POST /api/price answers 503
  reserveFailNext: boolean // the next reserve (add/edit) fails half-way, once
  random: () => number // replaceable in tests
}

const DEFAULTS: Chaos = { priceFailRate: 0.15, reserveFailNext: false, random: Math.random }

export const chaos: Chaos = { ...DEFAULTS }

// "Fail next reserve" button in Dev tools, and tests.
export function failNextReserve(): void {
  chaos.reserveFailNext = true
}

// "Reset demo data" also cancels a pending failure.
export function turnReserveFailureOff(): void {
  chaos.reserveFailNext = false
}

// True once after failNextReserve(), then false again.
export function takeReserveFailure(): boolean {
  if (!chaos.reserveFailNext) return false
  chaos.reserveFailNext = false
  return true
}

export function shouldFailPrice(): boolean {
  return chaos.random() < chaos.priceFailRate
}

// Tests start with no random failures; a test turns chaos on when it needs it.
export function turnChaosOffForTests(): void {
  Object.assign(chaos, DEFAULTS, { priceFailRate: 0 })
}
