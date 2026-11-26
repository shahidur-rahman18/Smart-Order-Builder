import type { Config, Group, OptionId } from '../../types/menu'
import { Card } from '../common/Card'
import { type GroupStatus, groupHint } from './groupStatus'
import { OptionRow } from './OptionRow'

interface Props {
  group: Group
  config: Config
  status: GroupStatus
  headroom: Record<OptionId, number | 'unlimited'> | null
  onChange: (optionId: OptionId, qty: number) => void
}

export function GroupSection({ group, config, status, headroom, onChange }: Props) {
  const hint = groupHint(group)

  return (
    <Card
      as="fieldset"
      id={`group-${group.id}`}
      title={group.name}
      subtitle={hint}
      badge={status.badge}
      badgeTone={status.tone}
      tone={status.hasProblem ? 'warn' : 'plain'}
      // The legend names the group for screen readers; the card title is what people see.
      legend={`${group.name} (${hint})`}
      // Room for the sticky header + sticky problem list on phones/tablets, so a chip jump
      // does not land the card under them.
      className="scroll-mt-44 lg:scroll-mt-4"
    >
      <ul className="grid gap-2 lg:gap-1">
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
    </Card>
  )
}
