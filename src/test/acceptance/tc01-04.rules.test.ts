import { describe, expect, it } from 'vitest'
import { menu } from '../../fixtures'
import { validate } from '../../engine/validate'
import { configByNames } from '../builders'
import type { Config, Violation } from '../../types/menu'

function check(config: Config): Violation[] {
  return validate(config, menu.groups, menu.rules)
}

// "id:kind" pairs, sorted, so a test can say exactly which violations it expects.
function summary(violations: Violation[]): string[] {
  return violations.map((v) => `${v.id}:${v.kind}`).sort()
}

describe('SPEC §9 rules acceptance tests', () => {
  it('TC-01 Scrambled x3 is blocked: eggs total must be 2-6 in steps of 2', () => {
    const violations = check(
      configByNames({ Toast: 1, Scrambled: 3, 'Chicken Sausage': 1 }),
    )
    expect(summary(violations)).toEqual(['eggs:step'])
    expect(violations[0].message).toBe('Eggs: total must be 2–6 in steps of 2 (you have 3)')
  })

  it('TC-02 Croissant + 3 extras is blocked: extras max is 2 (override wins over base max 4)', () => {
    const violations = check(
      configByNames({
        Croissant: 1, Scrambled: 2, 'Chicken Sausage': 1,
        'Hash Brown': 1, Mushroom: 1, 'Baked Beans': 1,
      }),
    )
    expect(summary(violations)).toEqual(['extras:max'])
    expect(violations[0].message).toBe('Extras: max is 2 when Croissant is selected (you have 3)')
  })

  it('TC-03 Hollandaise with only Fried eggs is blocked: requires Scrambled or Omelette', () => {
    const violations = check(
      configByNames({ Toast: 1, Fried: 2, 'Chicken Sausage': 1, Hollandaise: 1 }),
    )
    expect(summary(violations)).toEqual(['R1:requires'])
    expect(violations[0].message).toBe('Hollandaise requires Scrambled or Omelette')
  })

  it('TC-04 Tofu + Beef Bacon alone is blocked (excludes)', () => {
    const violations = check(
      configByNames({ Toast: 1, Scrambled: 2, Tofu: 1, 'Beef Bacon': 1 }),
    )
    expect(summary(violations)).toEqual(['R2:excludes'])
    expect(violations[0].message).toBe('Tofu cannot be combined with Beef Bacon')
  })

  it('TC-04 Chili + Hollandaise alone is blocked (excludes)', () => {
    const violations = check(
      configByNames({ Toast: 1, Scrambled: 2, 'Chicken Sausage': 1, Chili: 1, Hollandaise: 1 }),
    )
    expect(summary(violations)).toEqual(['R4:excludes'])
    expect(violations[0].message).toBe('Chili cannot be combined with Hollandaise')
  })

  it('TC-04 Tofu + Beef Bacon and Chili + Hollandaise together: both violations are listed', () => {
    const violations = check(
      configByNames({
        Toast: 1, Scrambled: 2, Tofu: 1, 'Beef Bacon': 1, Chili: 1, Hollandaise: 1,
      }),
    )
    expect(summary(violations)).toEqual(['R2:excludes', 'R4:excludes'])
  })
})
