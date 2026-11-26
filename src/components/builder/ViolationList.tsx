import type { Group, Violation } from '../../types/menu'

interface Props {
  violations: Violation[]
  groups: Group[]
}

// "Eggs: total must be 2–6…" → label "Eggs" + text "Total must be 2–6…".
// Rule problems (requires/excludes) have no group, so they get a general label.
function splitMessage(violation: Violation, groups: Group[]): { label: string; text: string } {
  const group = groups.find((g) => g.id === violation.id)
  if (!group) return { label: 'Rule', text: violation.message }
  const prefix = `${group.name}: `
  const rest = violation.message.startsWith(prefix) ? violation.message.slice(prefix.length) : violation.message
  return { label: group.name, text: rest.charAt(0).toUpperCase() + rest.slice(1) }
}

// Every problem at once (validate() never stops at the first one).
export function ViolationList({ violations, groups }: Props) {
  if (violations.length === 0) return null
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
            {violations.length}
          </span>
          Fix these before adding to cart
        </p>
        <p className="text-xs text-primary-hover">The matching card is outlined above</p>
      </div>
      <ul aria-label="Problems" className="mt-1.5 flex flex-wrap gap-1.5">
        {violations.map((v, index) => {
          const { label, text } = splitMessage(v, groups)
          return (
            <li
              key={`${v.id}-${v.kind}-${index}`}
              className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-2 py-0.5 text-xs"
            >
              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">{label}</span>
              <span className="text-ink">{text}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
