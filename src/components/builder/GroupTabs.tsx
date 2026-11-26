import type { Group } from '../../types/menu'
import type { GroupStatus } from './groupStatus'

interface Props {
  groups: Group[]
  statuses: GroupStatus[] // same order as groups
}

const LOOK: Record<GroupStatus['short'], string> = {
  done: 'border-ink bg-ink text-white',
  problem: 'border-amber-300 bg-amber-50 text-amber-800',
  empty: 'border-line bg-white text-muted',
}

const MARK: Record<GroupStatus['short'], string> = { done: ' ✓', problem: ' !', empty: '' }

// Phones and tablets: a row of chips, one per group, that jumps to its card.
// The chip shows at a glance which groups are done (✓) and which need a fix (!).
export function GroupTabs({ groups, statuses }: Props) {
  return (
    <nav aria-label="Groups" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] lg:hidden">
      <ul className="flex gap-2 pb-1">
        {groups.map((group, index) => {
          const short = statuses[index].short
          return (
            <li key={group.id} className="shrink-0">
              <a
                href={`#group-${group.id}`}
                className={`inline-flex h-9 items-center rounded-full border px-3.5 text-sm font-semibold whitespace-nowrap ${LOOK[short]}`}
              >
                {group.name}
                {MARK[short]}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
