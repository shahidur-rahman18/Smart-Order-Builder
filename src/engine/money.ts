import type { Poisha } from '../types/menu'

// numerator / denominator, rounded half up, using only integers.
// Adding half the denominator before dividing pushes x.5 up to the next number:
// (2n + d) / 2d  ===  n/d + 0.5, then floor. No decimal number is ever created.
// Only for non-negative values (money amounts here are never negative).
export function roundHalfUp(numerator: number, denominator: number): number {
  return Math.floor((2 * numerator + denominator) / (2 * denominator))
}

// percent% of amount, in poisha. Example: percentOf(150950, 5) = 7548.
export function percentOf(amount: Poisha, percent: number): Poisha {
  return roundHalfUp(amount * percent, 100)
}

// Round to the nearest whole taka, still in poisha. 158498 → 158500.
export function toWholeBdtPoisha(p: Poisha): Poisha {
  return roundHalfUp(p, 100) * 100
}

// Display only: 158500 → "1,585.00". Never use the result for math.
export function formatBdt(p: Poisha): string {
  const sign = p < 0 ? '-' : ''
  const abs = Math.abs(p)
  const taka = Math.floor(abs / 100)
  const poisha = abs % 100
  const takaWithCommas = String(taka).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${sign}${takaWithCommas}.${String(poisha).padStart(2, '0')}`
}
