import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { serverNow } from './clock'
import { STORAGE_KEY } from './storage'
import { initialState, readState, withState } from './state'

describe('server clock', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('server time is browser time + 90 s', () => {
    vi.setSystemTime(1_000_000)
    expect(serverNow()).toBe(1_090_000)
  })
})

describe('state in localStorage', () => {
  it('starts from the initial state when nothing is saved', () => {
    expect(readState()).toEqual(initialState())
  })

  it('withState saves the changed copy at the end', () => {
    withState((state) => {
      state.cart.couponCode = 'HELLO'
    })
    expect(readState().cart.couponCode).toBe('HELLO')
  })

  it('withState saves nothing when the work throws (atomic)', () => {
    withState((state) => {
      state.cart.couponCode = 'BEFORE'
    })
    const before = localStorage.getItem(STORAGE_KEY)

    expect(() =>
      withState((state) => {
        state.cart.couponCode = 'HALF-DONE'
        throw new Error('boom')
      }),
    ).toThrow('boom')

    expect(localStorage.getItem(STORAGE_KEY)).toBe(before)
    expect(readState().cart.couponCode).toBe('BEFORE')
  })

  it('reads localStorage at the start of every request (another tab wrote in between)', () => {
    withState((state) => {
      state.cart.couponCode = 'TAB-A'
    })
    // "Tab B" writes straight to localStorage.
    const other = initialState()
    other.cart.couponCode = 'TAB-B'
    localStorage.setItem(STORAGE_KEY, JSON.stringify(other))

    expect(readState().cart.couponCode).toBe('TAB-B')
  })

  it('broken or old saved data falls back to the initial state instead of crashing', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(readState()).toEqual(initialState())

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 999 }))
    expect(readState()).toEqual(initialState())
  })
})
