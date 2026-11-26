import { formatCountdown } from '../../hooks/useCountdown'
import { Badge } from '../common/Badge'

interface Props {
  msLeft: number
}

// Under this, the item is "about to expire" (amber card, amber badge).
export const SOON_MS = 60_000

export function Countdown({ msLeft }: Props) {
  const soon = msLeft < SOON_MS
  return (
    <span title="Time left before the held stock is released">
      <Badge tone={soon ? 'warn' : 'ok'} outline>
        <span aria-hidden="true" className="mr-1">
          ⏱
        </span>
        <span>{formatCountdown(msLeft)}</span>
        {soon && <span className="ml-1">· expires soon</span>}
      </Badge>
    </span>
  )
}
