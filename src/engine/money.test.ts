import { describe, expect, it } from 'vitest'
import { formatBdt, percentOf, roundHalfUp, toWholeBdtPoisha } from './money'

describe('why money is integer poisha', () => {
  it('floats are not exact: 0.1 + 0.2 is not 0.3', () => {
    expect(0.1 + 0.2).not.toBe(0.3)
  })
})

describe('roundHalfUp', () => {
  it('divides exactly when there is no remainder', () => {
    expect(roundHalfUp(700, 100)).toBe(7)
  })

  it('rounds down below half', () => {
    expect(roundHalfUp(749, 100)).toBe(7)
  })

  it('rounds up at exactly half (x.5)', () => {
    expect(roundHalfUp(750, 100)).toBe(8)
    expect(roundHalfUp(754750, 100)).toBe(7548)
    expect(roundHalfUp(4950, 100)).toBe(50)
  })

  it('rounds up above half', () => {
    expect(roundHalfUp(751, 100)).toBe(8)
  })

  it('returns 0 for 0', () => {
    expect(roundHalfUp(0, 100)).toBe(0)
  })
})

describe('percentOf', () => {
  it('TC-06 VAT: 5% of 150950 poisha is 7548 (7547.50 rounded up)', () => {
    expect(percentOf(150950, 5)).toBe(7548)
  })

  it('P1 10% of 75500 poisha is 7550', () => {
    expect(percentOf(75500, 10)).toBe(7550)
  })

  it('x.5 poisha goes up: 5% of 10 poisha = 0.5 → 1', () => {
    expect(percentOf(10, 5)).toBe(1)
  })

  it('below half goes down: 5% of 9 poisha = 0.45 → 0', () => {
    expect(percentOf(9, 5)).toBe(0)
  })
})

describe('toWholeBdtPoisha', () => {
  it('158498 poisha (BDT 1584.98) becomes 158500 (BDT 1585)', () => {
    expect(toWholeBdtPoisha(158498)).toBe(158500)
  })

  it('163748 poisha (BDT 1637.48) becomes 163700 (BDT 1637)', () => {
    expect(toWholeBdtPoisha(163748)).toBe(163700)
  })

  it('exactly half a taka goes up: 100050 → 100100', () => {
    expect(toWholeBdtPoisha(100050)).toBe(100100)
  })

  it('whole taka stays the same', () => {
    expect(toWholeBdtPoisha(158500)).toBe(158500)
  })
})

describe('formatBdt', () => {
  it('formats with thousands separator and 2 decimals', () => {
    expect(formatBdt(158500)).toBe('1,585.00')
    expect(formatBdt(165950)).toBe('1,659.50')
  })

  it('formats small amounts', () => {
    expect(formatBdt(7548)).toBe('75.48')
    expect(formatBdt(5)).toBe('0.05')
    expect(formatBdt(0)).toBe('0.00')
  })

  it('formats millions', () => {
    expect(formatBdt(123456789)).toBe('1,234,567.89')
  })
})
