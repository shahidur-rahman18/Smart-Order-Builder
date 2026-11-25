import { describe, expect, it } from 'vitest'
import { isStrictlyBefore, localDate } from './time'

const DHAKA = 'Asia/Dhaka'

describe('isStrictlyBefore', () => {
  it('10:59:59 Dhaka is before 11:00', () => {
    expect(isStrictlyBefore(Date.parse('2026-11-25T10:59:59+06:00'), '11:00', DHAKA)).toBe(true)
  })

  it('11:00:00 Dhaka is NOT before 11:00 (strict)', () => {
    expect(isStrictlyBefore(Date.parse('2026-11-25T11:00:00+06:00'), '11:00', DHAKA)).toBe(false)
  })

  it('uses the shop time zone, not UTC: 04:59:59Z is 10:59:59 in Dhaka', () => {
    expect(isStrictlyBefore(Date.parse('2026-11-25T04:59:59Z'), '11:00', DHAKA)).toBe(true)
    expect(isStrictlyBefore(Date.parse('2026-11-25T05:00:00Z'), '11:00', DHAKA)).toBe(false)
  })

  it('midnight is before, late evening is not', () => {
    expect(isStrictlyBefore(Date.parse('2026-11-25T00:00:00+06:00'), '11:00', DHAKA)).toBe(true)
    expect(isStrictlyBefore(Date.parse('2026-11-25T23:59:59+06:00'), '11:00', DHAKA)).toBe(false)
  })
})

describe('localDate', () => {
  it('gives the Dhaka calendar date', () => {
    expect(localDate(Date.parse('2026-11-25T23:30:00+06:00'), DHAKA)).toBe('2026-11-25')
  })

  it('19:30 UTC is already the next day in Dhaka', () => {
    expect(localDate(Date.parse('2026-11-25T19:30:00Z'), DHAKA)).toBe('2026-11-26')
  })
})
