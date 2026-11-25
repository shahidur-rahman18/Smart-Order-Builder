import { formatCountdown } from '../../hooks/useCountdown'

interface Props {
  msLeft: number
}

export function Countdown({ msLeft }: Props) {
  // The last minute is shown in amber, so the user notices before it runs out.
  const urgent = msLeft < 60_000
  return (
    <span className={urgent ? 'font-medium text-amber-700' : 'text-slate-600'}>{formatCountdown(msLeft)} left</span>
  )
}
