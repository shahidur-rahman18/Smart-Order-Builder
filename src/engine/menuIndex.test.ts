import { describe, expect, it } from 'vitest'
import { menu, seed } from '../fixtures'
import { buildMenuIndex } from './menuIndex'
import { configA, configB, configC, configByNames } from '../test/builders'
import type { Menu } from '../types/menu'

describe('menu fixture', () => {
  it('loads with all groups, rules and promotions', () => {
    expect(menu.groups).toHaveLength(5)
    expect(menu.rules).toHaveLength(4)
    expect(menu.promotions).toHaveLength(4)
    expect(menu.product.basePrice).toBe(25000)
  })

  it('every price is an integer (poisha)', () => {
    const prices = menu.groups.flatMap((g) => g.options.map((o) => o.price))
    for (const price of [menu.product.basePrice, ...prices]) {
      expect(Number.isInteger(price)).toBe(true)
    }
  })

  it('every option uses only known ingredients, and every ingredient has stock', () => {
    const ingredientIds = new Set(menu.ingredients.map((i) => i.id))
    for (const group of menu.groups) {
      for (const option of group.options) {
        for (const ingredient of Object.keys(option.uses)) {
          expect(ingredientIds.has(ingredient)).toBe(true)
        }
      }
    }
    for (const id of ingredientIds) {
      expect(menu.stock[id]).toBeTypeOf('number')
    }
  })

  it('every rule and promotion points at an existing option or group', () => {
    const index = buildMenuIndex(menu)
    const hasOption = (id: string) => index.optionById.has(id)
    const hasGroup = (id: string) => index.groupById.has(id)

    for (const rule of menu.rules) {
      expect(hasOption(rule.option)).toBe(true)
      if (rule.type === 'requires') expect(rule.anyOf.every(hasOption)).toBe(true)
      if (rule.type === 'excludes') expect(rule.with.every(hasOption)).toBe(true)
      if (rule.type === 'overrideLimit') expect(hasGroup(rule.group)).toBe(true)
    }
    for (const promo of menu.promotions) {
      if (promo.type === 'cheapestFree') expect(hasGroup(promo.group)).toBe(true)
      if (promo.type === 'comboPercent') {
        expect(promo.conditions.every((c) => hasGroup(c.group))).toBe(true)
      }
    }
  })
})

describe('buildMenuIndex', () => {
  it('finds an option and its group by option id', () => {
    const index = buildMenuIndex(menu)
    const firstGroup = menu.groups[0]
    const firstOption = firstGroup.options[0]
    expect(index.optionById.get(firstOption.id)).toBe(firstOption)
    expect(index.groupByOptionId.get(firstOption.id)).toBe(firstGroup)
  })

  it('throws when two options share an id', () => {
    const broken: Menu = structuredClone(menu)
    broken.groups[1].options[0].id = broken.groups[0].options[0].id
    expect(() => buildMenuIndex(broken)).toThrow(/duplicate option id/i)
  })

  it('throws when two groups share an id', () => {
    const broken: Menu = structuredClone(menu)
    broken.groups[1].id = broken.groups[0].id
    expect(() => buildMenuIndex(broken)).toThrow(/duplicate group id/i)
  })
})

describe('test builders', () => {
  it('configByNames turns option names into ids', () => {
    expect(configByNames({ Toast: 1, Scrambled: 2 })).toEqual({ toast: 1, scrambled: 2 })
  })

  it('configByNames throws on an unknown name', () => {
    expect(() => configByNames({ Pizza: 1 })).toThrow(/unknown option name/i)
  })

  it('A, B and C match the brief', () => {
    expect(configA()).toEqual({ toast: 1, scrambled: 2, sausage: 1, ketchup: 1 })
    expect(configB()).toEqual({
      croissant: 1, omelette: 2, fried: 2, sausage: 1, bacon: 1,
      hashbrown: 1, mushroom: 1, hollandaise: 1,
    })
    expect(configC()).toEqual({
      paratha: 1, fried: 2, tofu: 1, cheese: 2, beans: 1, mushroom: 1, chili: 1,
    })
  })

  it('seed orders use the same ids: ORD-1001 = A, ORD-1002 = B, ORD-1003 line 1 = C', () => {
    const byId = new Map(seed.orders.map((o) => [o.id, o]))
    expect(byId.get('ORD-1001')?.lines[0].options).toEqual(configA())
    expect(byId.get('ORD-1002')?.lines[0].options).toEqual(configB())
    expect(byId.get('ORD-1003')?.lines[0].options).toEqual(configC())
  })
})
