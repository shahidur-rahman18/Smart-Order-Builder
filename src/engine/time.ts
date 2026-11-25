// Shop-local clock helpers. Pure: the time is always passed in (ms since epoch).

// Hour, minute, second and date of `ms` as seen on a wall clock in `timeZone`.
function wallClock(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23', // 0–23, so midnight is 0 and never 24
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(ms))

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '00'

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    secondsOfDay: Number(get('hour')) * 3600 + Number(get('minute')) * 60 + Number(get('second')),
  }
}

// true if the local time in `timeZone` is earlier than `hhmm` ("11:00").
// Strict: exactly 11:00:00 is NOT before 11:00.
export function isStrictlyBefore(ms: number, hhmm: string, timeZone: string): boolean {
  const [hours, minutes] = hhmm.split(':').map(Number)
  const limit = hours * 3600 + minutes * 60
  return wallClock(ms, timeZone).secondsOfDay < limit
}

// Local calendar date in `timeZone`, as "YYYY-MM-DD".
export function localDate(ms: number, timeZone: string): string {
  return wallClock(ms, timeZone).date
}
