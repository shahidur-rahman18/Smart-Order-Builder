// The server's clock is not the browser's clock (the mock runs 90 s ahead).
// Every response carries serverTime; from it we learn the difference once and
// then every countdown / expiry check uses serverNow(), never Date.now() alone.
let offsetMs = 0

// Called by client.ts on every response.
export function updateOffset(serverTime: number): void {
  offsetMs = serverTime - Date.now()
}

export function serverNow(): number {
  return Date.now() + offsetMs
}

export function clockOffset(): number {
  return offsetMs
}
