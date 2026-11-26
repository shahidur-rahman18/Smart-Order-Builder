import type { Config, Group, OptionId, Violation } from '../../types/menu'
import { card } from '../ui'
import { OptionRow } from './OptionRow'

interface Props {
  group: Group
  config: Config
  headroom: Record<OptionId, number | 'unlimited'> | null
  // All problems of the draft; this card shows a badge for its own (id = group id).
  violations: Violation[]
  onChange: (optionId: OptionId, qty: number) => void
}

// Short hint built from the group's own limits, e.g. "choose 2–6, in steps of 2".
// Rules that change a limit (overrideLimit) are explained by the violations list.
function groupHint(group: Group): string {
  const parts: string[] = []
  if (group.max === undefined) {
    parts.push(group.min > 0 ? `choose at least ${group.min}` : 'optional')
  } else if (group.min === group.max) {
    parts.push(`choose ${group.min}`)
  } else if (group.min === 0) {
    parts.push(`optional, up to ${group.max}`)
  } else {
    parts.push(`choose ${group.min}–${group.max}`)
  }
  if (group.step !== undefined) parts.push(`in steps of ${group.step}`)
  if (group.maxDistinct !== undefined) parts.push(`up to ${group.maxDistinct} different`)
  if (group.maxPerOption !== undefined) parts.push(`max ${group.maxPerOption} each`)
  return parts.join(', ')
}

function StatusBadge({ total, hasProblem }: { total: number; hasProblem: boolean }) {
  const base = 'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold'
  if (hasProblem && total === 0) return <span className={`${base} bg-selected text-primary-hover`}>Required</span>
  if (hasProblem) return <span className={`${base} bg-red-50 text-red-700`}>Check rules</span>
  if (total === 0) return <span className={`${base} bg-page text-muted`}>Optional</span>
  return <span className={`${base} bg-emerald-50 text-emerald-700`}>✓ {total} chosen</span>
}

export function GroupSection({ group, config, headroom, violations, onChange }: Props) {
  const hint = groupHint(group)
  const total = group.options.reduce((sum, option) => sum + (config[option.id] ?? 0), 0)
  const hasProblem = violations.some((v) => v.id === group.id)

  return (
    <fieldset className={card}>
      {/* The legend names the group for screen readers; the header below is what people see. */}
      <legend className="sr-only">
        {group.name} ({hint})
      </legend>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink">{group.name}</h3>
          <p className="text-xs text-muted">{hint}</p>
        </div>
        <StatusBadge total={total} hasProblem={hasProblem} />
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {group.options.map((option) => (
          <OptionRow
            key={option.id}
            option={option}
            qty={config[option.id] ?? 0}
            headroom={headroom ? (headroom[option.id] ?? 'unlimited') : null}
            onChange={(qty) => onChange(option.id, qty)}
          />
        ))}
      </ul>
    </fieldset>
  )
}
