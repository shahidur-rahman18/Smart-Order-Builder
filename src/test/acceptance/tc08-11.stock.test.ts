import { describe, expect, it } from 'vitest'
import { menu } from '../../fixtures'
import {
  availableForEdit,
  availableStock,
  formatShortages,
  shortagesFor,
  usageOf,
} from '../../engine/stock'
import { priceUnit } from '../../engine/pricing'
import { validate } from '../../engine/validate'
import { configA, configB, configByNames, configC } from '../builders'
import type { CartLineInput } from '../../types/menu'

// Cart from SPEC §9: B x1 + C x2, both still reserved.
const lineB: CartLineInput = { id: 'line-b', config: configB(), quantity: 1 }
const lineC: CartLineInput = { id: 'line-c', config: configC(), quantity: 2 }
const cart = [lineB, lineC]

// Ingredient ids come from the fixture, so the test text stays id-free.
const ingredientId = (name: string) => {
  const found = menu.ingredients.find((i) => i.name === name)
  if (!found) throw new Error(`Unknown ingredient: ${name}`)
  return found.id
}
const EGG = ingredientId('egg')
const CHEESE = ingredientId('cheese')
const CROISSANT = ingredientId('croissant')

describe('SPEC §9 stock acceptance tests', () => {
  it('TC-08 B x1 + C x2: egg 0, cheese 0, croissant 1; a new egg item is blocked with reason', () => {
    const available = availableStock(menu, [], cart)
    expect(available[EGG]).toBe(0)
    expect(available[CHEESE]).toBe(0)
    expect(available[CROISSANT]).toBe(1)

    const shortages = shortagesFor(usageOf(configA(), menu, 1), available, menu)
    expect(formatShortages(shortages)).toBe('Short: 2 egg')
  })

  it('TC-09 edit B to Omelette x3 + Fried x1: blocked "Short: 1 egg" (B\'s own 6 eggs count)', () => {
    const newB = { ...configB(), ...configByNames({ Omelette: 3, Fried: 1 }) }
    expect(validate(newB, menu.groups, menu.rules)).toEqual([])

    const available = availableForEdit(availableStock(menu, [], cart), lineB, menu)
    const shortages = shortagesFor(usageOf(newB, menu, 1), available, menu)
    expect(formatShortages(shortages)).toBe('Short: 1 egg')
  })

  it('TC-10 edit B to Omelette x1 + Fried x3: allowed, B = 643.50, egg remaining 1', () => {
    const newB = { ...configB(), ...configByNames({ Omelette: 1, Fried: 3 }) }
    expect(validate(newB, menu.groups, menu.rules)).toEqual([])

    const available = availableForEdit(availableStock(menu, [], cart), lineB, menu)
    expect(shortagesFor(usageOf(newB, menu, 1), available, menu)).toEqual([])
    expect(priceUnit(newB, menu).unitPrice).toBe(64350)

    const after = availableStock(menu, [], [{ ...lineB, config: newB }, lineC])
    expect(after[EGG]).toBe(1)
  })

  it('TC-11 change C quantity 2 -> 3: blocked "Short: 2 egg, 2 cheese" (all shortages listed)', () => {
    const available = availableForEdit(availableStock(menu, [], cart), lineC, menu)
    const shortages = shortagesFor(usageOf(lineC.config, menu, 3), available, menu)
    expect(shortages).toEqual([
      { ingredient: EGG, name: 'egg', missing: 2 },
      { ingredient: CHEESE, name: 'cheese', missing: 2 },
    ])
    expect(formatShortages(shortages)).toBe('Short: 2 egg, 2 cheese')
  })
})
