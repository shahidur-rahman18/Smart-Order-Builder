import type { ReactNode } from 'react'
import { Badge, type Tone } from './Badge'

interface Props {
  title?: string
  subtitle?: string
  headingLevel?: 2 | 3
  headingId?: string
  // Small pill at the top right, e.g. "1 / need 2".
  badge?: string
  badgeTone?: Tone
  // Free text at the top right instead of a badge, e.g. "2 items · stock held for you".
  aside?: ReactNode
  // Border colour: normal, or yellow when something needs attention.
  tone?: 'plain' | 'warn'
  // Which HTML element to use, so a group can stay a <fieldset> for screen readers.
  as?: 'section' | 'div' | 'fieldset'
  // Only for a fieldset: its hidden name for screen readers (must be the first child).
  legend?: string
  id?: string
  ariaLabelledBy?: string
  className?: string
  children: ReactNode
}

const TONES: Record<NonNullable<Props['tone']>, string> = {
  plain: 'border-line bg-white',
  warn: 'border-amber-300 bg-amber-50/40',
}

// The one card used everywhere (option groups, cart, price…).
// Change the look here and every card changes.
export function Card({
  title,
  subtitle,
  headingLevel = 3,
  headingId,
  badge,
  badgeTone = 'neutral',
  aside,
  tone = 'plain',
  as: Tag = 'section',
  legend,
  id,
  ariaLabelledBy,
  className = '',
  children,
}: Props) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  const hasTop = title !== undefined || badge !== undefined || aside !== undefined

  return (
    <Tag
      id={id}
      aria-labelledby={ariaLabelledBy}
      className={`min-w-0 rounded-2xl border p-3 shadow-sm lg:p-2.5 xl:p-3 ${TONES[tone]} ${className}`}
    >
      {legend && <legend className="sr-only">{legend}</legend>}
      {hasTop && (
        <div className="mb-2 flex items-start justify-between gap-1.5">
          <div className="min-w-0">
            {title && (
              <Heading id={headingId} className="text-base leading-tight font-bold text-ink">
                {title}
              </Heading>
            )}
            {subtitle && <p className="text-xs leading-snug text-muted">{subtitle}</p>}
          </div>
          {badge !== undefined && <Badge tone={badgeTone}>{badge}</Badge>}
          {aside}
        </div>
      )}
      {children}
    </Tag>
  )
}
