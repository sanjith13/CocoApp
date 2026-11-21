/** Today's date (YYYY-MM-DD) in Asia/Kolkata. */
export function todayIST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** The same calendar day one year earlier (ISO YYYY-MM-DD); 29 Feb clamps to 28 Feb. */
export function oneYearBefore(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const day = m === 2 && d === 29 ? 28 : d
  return `${String(y - 1).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** ISO date shifted by a number of days (UTC calendar arithmetic; no DST involved). */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}
