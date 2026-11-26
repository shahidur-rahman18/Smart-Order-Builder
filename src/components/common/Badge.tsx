import type { ReactNode } from 'react'

export type Tone = 'neutral' | 'ok' | 'warn' | 'bad'

const TONES: Record<Tone, string> = {
  neutral: 'bg-page text-muted',
  ok: 'bg-emerald-50 text-emerald-700',
  warn: 'bg-amber-100 text-amber-800',
  bad: 'bg-red-50 text-red-700',
}

// Thin border in the same colour, for pills that sit on a white card (cart countdown).
const OUTLINES: Record<Tone, string> = {
  neutral: 'ring-1 ring-inset ring-line',
  ok: 'ring-1 ring-inset ring-emerald-200',
  warn: 'ring-1 ring-inset ring-amber-300',
  bad: 'ring-1 ring-inset ring-red-200',
}

// Small rounded label: status, counts, countdowns.
export function Badge({
  tone = 'neutral',
  outline = false,
  children,
}: {
  tone?: Tone
  outline?: boolean
  children: ReactNode
}) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${TONES[tone]} ${outline ? OUTLINES[tone] : ''}`}>
      {children}
    </span>
  )
}
