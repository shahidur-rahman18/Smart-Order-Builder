import { describe, expect, it } from 'vitest'
import { menu } from '../fixtures'
import { validate } from './validate'
import { configA, configB, configC, configByNames } from '../test/builders'
import type { Config, Menu, Violation } from '../types/menu'

function check(config: Config, source: Menu = menu): Violation[] {
  return validate(config, source.groups, source.rules)
}

function summary(violations: Violation[]): string[] {
  return violations.map((v) => `${v.id}:${v.kind}`).sort()
}

// A valid base (bread + eggs + protein) so each test only adds what it is about.
const base = { Toast: 1, Scrambled: 2, 'Chicken Sausage': 1 }

describe('validate: valid configurations', () => {
  it('Scrambled x1 + Fried x1 is valid (step counts the group total, not each option)', () => {
    expect(check(configByNames({ Toast: 1, Scrambled: 1, Fried: 1, 'Chicken Sausage': 1 }))).toEqual([])
  })

  it('SPEC items A, B and C are valid', () => {
    expect(check(configA())).toEqual([])
    expect(check(configB())).toEqual([])
    expect(check(configC())).toEqual([])
  })

  it('without the override option, extras keep the base max (4 extras is fine)', () => {
    const config = configByNames({
      ...base, 'Hash Brown': 1, Mushroom: 1, 'Baked Beans': 1, Cheese: 1,
    })
    expect(check(config)).toEqual([])
  })
})

describe('validate: group limits', () => {
  it('min: an empty config lists every group with a minimum', () => {
    expect(summary(check({}))).toEqual(['bread:min', 'eggs:min', 'protein:min'])
  })

  it('min: no bread is blocked with a readable message', () => {
    const violations = check(configByNames({ Scrambled: 2, 'Chicken Sausage': 1 }))
    expect(summary(violations)).toEqual(['bread:min'])
    expect(violations[0].message).toBe('Bread: choose at least 1 (you have 0)')
  })

  it('max: 4 proteins is blocked (max 3)', () => {
    const violations = check(configByNames({ Toast: 1, Scrambled: 2, 'Chicken Sausage': 2, 'Beef Bacon': 2 }))
    expect(summary(violations)).toEqual(['protein:max'])
    expect(violations[0].message).toBe('Protein: choose at most 3 (you have 4)')
  })

  it('max: 8 eggs is blocked even though 8 is a multiple of the step', () => {
    const violations = check(configByNames({ Toast: 1, Scrambled: 8, 'Chicken Sausage': 1 }))
    expect(summary(violations)).toEqual(['eggs:max'])
  })

  it('without the override option, 5 extras breaks the base max with no override text', () => {
    const violations = check(configByNames({
      ...base, 'Hash Brown': 2, Mushroom: 1, 'Baked Beans': 1, Cheese: 1,
    }))
    expect(summary(violations)).toEqual(['extras:max'])
    expect(violations[0].message).toBe('Extras: choose at most 4 (you have 5)')
  })

  it('maxDistinct: three different sauces is blocked (max 2 kinds)', () => {
    // Ketchup + Chili + Hollandaise also breaks an excludes rule; here we only look at the sauce limit.
    const violations = check(configByNames({ ...base, Ketchup: 1, Chili: 1, Hollandaise: 1 }))
    expect(summary(violations)).toContain('sauce:maxDistinct')
    const sauce = violations.find((v) => v.kind === 'maxDistinct')
    expect(sauce?.message).toBe('Sauce: choose at most 2 different (you have 3)')
  })

  it('maxPerOption: Ketchup x2 is blocked (max 1 of each sauce)', () => {
    const violations = check(configByNames({ ...base, Ketchup: 2 }))
    expect(summary(violations)).toEqual(['sauce:maxPerOption'])
    expect(violations[0].message).toBe('Sauce: at most 1 of each (Ketchup has 2)')
  })

  it('collects all violations, not just the first', () => {
    const violations = check(configByNames({ Scrambled: 3, Ketchup: 2 }))
    expect(summary(violations)).toEqual([
      'bread:min', 'eggs:step', 'protein:min', 'sauce:maxPerOption',
    ])
  })
})

describe('validate: overrideLimit', () => {
  it('with several overrides on the same group, the smallest max wins', () => {
    const strict: Menu = structuredClone(menu)
    const override = strict.rules.find((r) => r.type === 'overrideLimit')
    if (!override || override.type !== 'overrideLimit') throw new Error('fixture has no overrideLimit rule')
    strict.rules.push({ ...override, id: 'R-test', max: 1 })

    const violations = check(configByNames({
      Croissant: 1, Scrambled: 2, 'Chicken Sausage': 1, 'Hash Brown': 1, Mushroom: 1,
    }), strict)
    expect(summary(violations)).toEqual(['extras:max'])
    expect(violations[0].message).toBe('Extras: max is 1 when Croissant is selected (you have 2)')
  })
})

describe('validate: unknown option', () => {
  it('an option id that is not on the menu is reported, not ignored', () => {
    const violations = check({ ...configByNames(base), pizza: 1 })
    expect(summary(violations)).toEqual(['pizza:unknown'])
    expect(violations[0].message).toBe('Unknown option: pizza')
  })
})
