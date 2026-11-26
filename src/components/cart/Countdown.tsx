import { formatCountdown } from '../../hooks/useCountdown'

interface Props {
  msLeft: number
}

export function Countdown({ msLeft }: Props) {
  // The last minute is shown in red, so the user notices before it runs out.
  const urgent = msLeft < 60_000
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${urgent ? 'bg-red-50 text-red-700' : 'bg-page text-muted'}`}
    >
      {formatCountdown(msLeft)} left
    </span>
  )
}
