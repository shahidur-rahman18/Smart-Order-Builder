import type { Config, Group, OptionId } from '../../types/menu'
import { OptionRow } from './OptionRow'

interface Props {
  group: Group
  config: Config
  headroom: Record<OptionId, number | 'unlimited'> | null
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

export function GroupSection({ group, config, headroom, onChange }: Props) {
  return (
    <fieldset className="rounded-lg border border-slate-200 bg-white p-4">
      <legend className="px-1 font-semibold">
        {group.name} <span className="text-sm font-normal text-slate-500">({groupHint(group)})</span>
      </legend>
      <ul className="divide-y divide-slate-100">
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
