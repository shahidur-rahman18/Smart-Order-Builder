// The mock server's clock runs 90 s ahead of the browser, on purpose (SPEC Part D).
// This is the ONLY place server time comes from. The browser learns the
// difference from `serverTime` in every response (src/api/serverClock.ts).
const SKEW_MS = 90_000

export function serverNow(): number {
  return Date.now() + SKEW_MS
}
