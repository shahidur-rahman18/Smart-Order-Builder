import { effectiveMax } from '../../engine/validate'
import type { Config, Group, Rule, Violation } from '../../types/menu'
import type { Tone } from '../common/Badge'

export interface GroupStatus {
  total: number
  hasProblem: boolean
  badge: string // "1/3", "1 / need 2", "3/2", "0"
  tone: Tone
  short: 'done' | 'problem' | 'empty' // for the phone chips: ✓, ! or nothing
}

// The smallest total that would be allowed, from the group's own min and step.
function neededTotal(group: Group, total: number): number {
  const atLeast = Math.max(group.min, total)
  if (group.step === undefined) return atLeast
  return Math.ceil(atLeast / group.step) * group.step
}

// Everything a group card needs to show how it is doing, from menu data only.
export function groupStatus(group: Group, config: Config, rules: Rule[], violations: Violation[]): GroupStatus {
  const total = group.options.reduce((sum, option) => sum + (config[option.id] ?? 0), 0)
  const hasProblem = violations.some((v) => v.id === group.id)
  const { max } = effectiveMax(group, config, rules)
  const ofMax = max === undefined ? `${total}` : `${total}/${max}`

  if (max !== undefined && total > max) return { total, hasProblem, badge: ofMax, tone: 'bad', short: 'problem' }
  if (hasProblem) {
    const need = neededTotal(group, total)
    const badge = need !== total ? `${total} / need ${need}` : `${total} · check`
    return { total, hasProblem, badge, tone: 'warn', short: 'problem' }
  }
  if (total === 0) return { total, hasProblem, badge: '0', tone: 'neutral', short: 'empty' }
  return { total, hasProblem, badge: ofMax, tone: 'ok', short: 'done' }
}

// Short hint built from the group's own limits, e.g. "Choose 2–6, in steps of 2".
// Rules that change a limit (overrideLimit) are explained by the problems list.
export function groupHint(group: Group): string {
  const parts: string[] = []
  // "Choose" is dropped when a step follows, to keep the line short: "2–6, in steps of 2".
  const verb = group.step === undefined ? 'Choose ' : ''
  if (group.max === undefined) {
    if (group.min > 0) parts.push(`${verb}at least ${group.min}`)
  } else if (group.min === group.max) {
    parts.push(`${verb}${group.min}`)
  } else if (group.min === 0) {
    parts.push(`Up to ${group.max}`)
  } else {
    parts.push(`${verb}${group.min}–${group.max}`)
  }
  if (group.step !== undefined) parts.push(`in steps of ${group.step}`)
  if (group.maxDistinct !== undefined) parts.push(`${group.maxDistinct} kinds max`)
  if (group.maxPerOption !== undefined) parts.push(`${group.maxPerOption} each`)
  return parts.length > 0 ? parts.join(', ') : 'Optional'
}
