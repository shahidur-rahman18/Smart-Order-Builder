interface Props {
  value: number
  label: string // what is counted, e.g. "Scrambled" → "Add one Scrambled"
  valueLabel: string // accessible name of the number, e.g. "Scrambled quantity"
  onChange: (value: number) => void
  // A reason disables the button and is shown as its title (why it cannot be pressed).
  minusDisabledReason?: string
  plusDisabledReason?: string
  tone?: 'light' | 'dark'
  // Smaller buttons on large screens, so five group columns fit side by side.
  compact?: boolean
}

const COLOURS: Record<NonNullable<Props['tone']>, string> = {
  light:
    'border-line bg-white text-ink hover:border-primary hover:bg-selected disabled:hover:border-line disabled:hover:bg-white',
  dark: 'border-white/20 bg-white/10 text-white hover:bg-white/20 disabled:hover:bg-white/10',
}

// "−  2  +" control, used for options and for the whole item's quantity.
export function Stepper({
  value,
  label,
  valueLabel,
  onChange,
  minusDisabledReason,
  plusDisabledReason,
  tone = 'light',
  compact = false,
}: Props) {
  const size = compact ? 'h-8 w-8 lg:h-[22px] lg:w-[22px] lg:rounded-md lg:text-sm' : 'h-9 w-9'
  const button = `flex ${size} items-center justify-center rounded-lg border text-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${COLOURS[tone]}`
  let numberColour = value > 0 ? 'text-primary' : 'text-muted'
  if (tone === 'dark') numberColour = 'text-white'

  return (
    <div className={`flex shrink-0 items-center ${compact ? 'gap-1 lg:gap-0.5' : 'gap-1'}`}>
      <button
        type="button"
        className={button}
        aria-label={`Remove one ${label}`}
        title={minusDisabledReason}
        disabled={minusDisabledReason !== undefined}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <output
        aria-label={valueLabel}
        className={`${compact ? 'w-6 lg:w-4 lg:text-sm' : 'w-6'} text-center font-bold tabular-nums ${numberColour}`}
      >
        {value}
      </output>
      <button
        type="button"
        className={button}
        aria-label={`Add one ${label}`}
        title={plusDisabledReason}
        disabled={plusDisabledReason !== undefined}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  )
}
