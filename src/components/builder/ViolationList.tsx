import type { Violation } from '../../types/menu'

// Every problem at once (validate() never stops at the first one).
export function ViolationList({ violations }: { violations: Violation[] }) {
  if (violations.length === 0) return null
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-semibold">Please fix before adding:</p>
      <ul aria-label="Problems" className="mt-1 list-disc pl-5">
        {violations.map((v, index) => (
          <li key={`${v.id}-${v.kind}-${index}`}>{v.message}</li>
        ))}
      </ul>
    </div>
  )
}
