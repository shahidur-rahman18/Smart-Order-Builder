import type { Config, Group, MenuOption, OptionId, Rule, Violation } from '../types/menu'

// Returns every violation (never stops at the first), so the UI can list them all.
// Order: group limits (menu order), then rules (menu order), then unknown options.
export function validate(config: Config, groups: Group[], rules: Rule[]): Violation[] {
  const violations: Violation[] = []
  for (const group of groups) {
    violations.push(...checkGroup(group, config, groups, rules))
  }
  for (const rule of rules) {
    const violation = checkRule(rule, config, groups)
    if (violation) violations.push(violation)
  }
  violations.push(...findUnknownOptions(config, groups))
  return violations
}

// Cross-group rules. One violation per broken rule. overrideLimit is not checked
// here: it changes a group's max, so checkGroup handles it.
function checkRule(rule: Rule, config: Config, groups: Group[]): Violation | undefined {
  if (rule.type === 'overrideLimit') return undefined
  if (qtyOf(config, rule.option) === 0) return undefined

  if (rule.type === 'requires') {
    const hasOne = rule.anyOf.some((id) => qtyOf(config, id) > 0)
    if (hasOne) return undefined
    const needed = rule.anyOf.map((id) => optionName(groups, id)).join(' or ')
    return { id: rule.id, kind: 'requires', message: `${optionName(groups, rule.option)} requires ${needed}` }
  }

  const clashes = rule.with.filter((id) => qtyOf(config, id) > 0)
  if (clashes.length === 0) return undefined
  const names = clashes.map((id) => optionName(groups, id)).join(' and ')
  return { id: rule.id, kind: 'excludes', message: `${optionName(groups, rule.option)} cannot be combined with ${names}` }
}

function checkGroup(group: Group, config: Config, groups: Group[], rules: Rule[]): Violation[] {
  const violations: Violation[] = []
  const chosen = group.options.filter((option) => qtyOf(config, option.id) > 0)
  const total = chosen.reduce((sum, option) => sum + qtyOf(config, option.id), 0)
  const limit = effectiveMax(group, config, rules)

  if (total < group.min) {
    violations.push({ id: group.id, kind: 'min', message: minMaxMessage(group, limit.max, total, 'min') })
  }

  if (limit.max !== undefined && total > limit.max) {
    const message = limit.overriddenBy
      ? `${group.name}: max is ${limit.max} when ${optionName(groups, limit.overriddenBy)} is selected (you have ${total})`
      : minMaxMessage(group, limit.max, total, 'max')
    violations.push({ id: group.id, kind: 'max', message })
  }

  if (group.step !== undefined && total % group.step !== 0) {
    violations.push({ id: group.id, kind: 'step', message: stepMessage(group, limit.max, total) })
  }

  if (group.maxDistinct !== undefined && chosen.length > group.maxDistinct) {
    violations.push({
      id: group.id,
      kind: 'maxDistinct',
      message: `${group.name}: choose at most ${group.maxDistinct} different (you have ${chosen.length})`,
    })
  }

  if (group.maxPerOption !== undefined) {
    for (const option of chosen) {
      const qty = qtyOf(config, option.id)
      if (qty > group.maxPerOption) {
        violations.push({
          id: group.id,
          kind: 'maxPerOption',
          message: `${group.name}: at most ${group.maxPerOption} of each (${option.name} has ${qty})`,
        })
      }
    }
  }

  return violations
}

interface Limit {
  max: number | undefined
  overriddenBy: OptionId | undefined // the selected option whose rule set this max
}

// An overrideLimit rule replaces the group's max while its option is selected.
// If several such options are selected, the smallest max wins (the safest limit).
function effectiveMax(group: Group, config: Config, rules: Rule[]): Limit {
  let best: { max: number; option: OptionId } | undefined

  for (const rule of rules) {
    if (rule.type !== 'overrideLimit') continue
    if (rule.group !== group.id) continue
    if (qtyOf(config, rule.option) === 0) continue

    if (best === undefined || rule.max < best.max) {
      best = { max: rule.max, option: rule.option }
    }
  }

  if (best === undefined) return { max: group.max, overriddenBy: undefined }
  return { max: best.max, overriddenBy: best.option }
}

function findUnknownOptions(config: Config, groups: Group[]): Violation[] {
  const known = new Set(groups.flatMap((group) => group.options.map((option) => option.id)))
  return Object.keys(config)
    .filter((id) => !known.has(id))
    .map((id) => ({ id, kind: 'unknown', message: `Unknown option: ${id}` }))
}

// Groups with a step get one combined sentence, e.g. "total must be 2–6 in steps of 2".
function minMaxMessage(group: Group, max: number | undefined, total: number, kind: 'min' | 'max'): string {
  if (group.step !== undefined) return stepMessage(group, max, total)
  if (kind === 'min') return `${group.name}: choose at least ${group.min} (you have ${total})`
  return `${group.name}: choose at most ${max} (you have ${total})`
}

function stepMessage(group: Group, max: number | undefined, total: number): string {
  const range = max === undefined ? `at least ${group.min}` : `${group.min}–${max}`
  return `${group.name}: total must be ${range} in steps of ${group.step} (you have ${total})`
}

function qtyOf(config: Config, id: OptionId): number {
  return config[id] ?? 0
}

function optionName(groups: Group[], id: OptionId): string {
  const option: MenuOption | undefined = groups
    .flatMap((group) => group.options)
    .find((o) => o.id === id)
  return option ? option.name : id
}
