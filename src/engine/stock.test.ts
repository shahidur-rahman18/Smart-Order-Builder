import { describe, expect, it } from 'vitest'
import { menu } from '../fixtures'
import {
  availableForEdit,
  availableStock,
  formatShortages,
  optionHeadroom,
  shortagesFor,
  subtractUsage,
  sumUsage,
  usageOf,
} from './stock'
import { configA, configB, configByNames, configC } from '../test/builders'
import type { Config } from '../types/menu'

const idOf = (name: string) => Object.keys(configByNames({ [name]: 1 }))[0]
const ingredient = (name: string) => {
  const found = menu.ingredients.find((i) => i.name === name)
  if (!found) throw new Error(`Unknown ingredient: ${name}`)
  return found.id
}
const EGG = ingredient('egg')
const CHEESE = ingredient('cheese')
const empty: Config = {}

describe('usageOf', () => {
  it('counts option qty × ingredient use (Omelette uses 2 eggs)', () => {
    expect(usageOf(configB(), menu, 1)[EGG]).toBe(6)
  })

  it('item quantity multiplies usage', () => {
    expect(usageOf(configC(), menu, 2)[EGG]).toBe(4)
    expect(usageOf(configC(), menu, 2)[CHEESE]).toBe(4)
  })

  it('options that use nothing add nothing', () => {
    expect(usageOf(configByNames({ Ketchup: 1, Chili: 1 }), menu, 3)).toEqual({})
  })

  it('throws for an option id the menu does not know', () => {
    expect(() => usageOf({ 'not-on-menu': 1 }, menu, 1)).toThrow('Unknown option id')
  })
})

describe('sumUsage / subtractUsage', () => {
  it('adds and subtracts per ingredient, keeping ingredients only one side has', () => {
    expect(sumUsage({ a: 1 }, { a: 2, b: 3 })).toEqual({ a: 3, b: 3 })
    expect(subtractUsage({ a: 5, b: 1 }, { a: 2 })).toEqual({ a: 3, b: 1 })
  })
})

describe('availableStock', () => {
  it('empty cart and no orders = fixture stock', () => {
    expect(availableStock(menu, [], [])).toEqual(menu.stock)
  })

  it('sold and reserved both reduce stock', () => {
    const available = availableStock(menu, [{ config: configA(), quantity: 1 }], [{ config: configA(), quantity: 2 }])
    expect(available[EGG]).toBe(10 - 2 - 4)
  })

  it('never goes below 0', () => {
    const available = availableStock(menu, [], [{ config: configB(), quantity: 3 }])
    expect(available[EGG]).toBe(0)
  })
})

describe('availableForEdit (net difference)', () => {
  it('adds back exactly the item\'s own allocation, never more', () => {
    const line = { config: configA(), quantity: 2 }
    const available = availableStock(menu, [], [line])
    const forEdit = availableForEdit(available, line, menu)
    // Adding back its own 4 eggs gives the stock we would have without it.
    expect(forEdit[EGG]).toBe(available[EGG] + 4)
    expect(forEdit).toEqual(availableStock(menu, [], []))
  })
})

describe('shortagesFor / formatShortages', () => {
  it('lists every short ingredient in fixture order', () => {
    const shortages = shortagesFor({ [CHEESE]: 5, [EGG]: 12 }, menu.stock, menu)
    expect(formatShortages(shortages)).toBe('Short: 2 egg, 1 cheese')
  })

  it('nothing short → empty list and empty text', () => {
    expect(shortagesFor(usageOf(configA(), menu, 1), menu.stock, menu)).toEqual([])
    expect(formatShortages([])).toBe('')
  })

  it('uses the ingredient display name, not the id', () => {
    const hashBrown = ingredient('hash brown')
    expect(formatShortages(shortagesFor({ [hashBrown]: 7 }, menu.stock, menu))).toBe('Short: 1 hash brown')
  })
})

describe('optionHeadroom', () => {
  it('fresh stock, empty draft: Omelette 5 (2 eggs each), Fried 10', () => {
    const headroom = optionHeadroom(menu, menu.stock, empty, 1)
    expect(headroom[idOf('Omelette')]).toBe(5)
    expect(headroom[idOf('Fried')]).toBe(10)
  })

  it('options that use nothing are unlimited', () => {
    expect(optionHeadroom(menu, menu.stock, empty, 1)[idOf('Ketchup')]).toBe('unlimited')
  })

  it('subtracts what the draft already uses', () => {
    expect(optionHeadroom(menu, menu.stock, configA(), 1)[idOf('Fried')]).toBe(8)
  })

  it('quantity multiplies the cost of one more unit', () => {
    expect(optionHeadroom(menu, menu.stock, empty, 3)[idOf('Omelette')]).toBe(1)
  })

  it('after TC-08 cart: eggs 0 → every egg option is 0; Croissant 1 left', () => {
    const available = availableStock(menu, [], [
      { config: configB(), quantity: 1 },
      { config: configC(), quantity: 2 },
    ])
    const headroom = optionHeadroom(menu, available, empty, 1)
    expect(headroom[idOf('Fried')]).toBe(0)
    expect(headroom[idOf('Omelette')]).toBe(0)
    expect(headroom[idOf('Croissant')]).toBe(1)
  })
})
