const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Rows come from the untyped Supabase client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>

export const monthName = (m: number) => MONTHS[m - 1]

/** '2025-03-01' -> 'Mar 25' */
export function monthLabel(iso: string): string {
  const [y, m] = iso.split('-').map(Number)
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`
}

/** '2025-03-17' -> '17 Mar' */
export function dayLabel(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}

/** Sums `value(row)` per `key(row)`, keeping keys in sorted order. Nulls are ignored. */
export function sumBy<T = Row>(rows: T[], key: (r: T) => string, value: (r: T) => number | null): Array<[string, number]> {
  const m = new Map<string, number>()
  for (const r of rows) {
    const v = value(r)
    if (v === null || Number.isNaN(v)) continue
    m.set(key(r), (m.get(key(r)) ?? 0) + v)
  }
  return [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
}

/** Averages `value(row)` per key, sorted by key. Nulls are ignored. */
export function avgBy<T = Row>(rows: T[], key: (r: T) => string, value: (r: T) => number | null): Array<[string, number]> {
  const s = new Map<string, { sum: number; n: number }>()
  for (const r of rows) {
    const v = value(r)
    if (v === null || Number.isNaN(v)) continue
    const e = s.get(key(r)) ?? { sum: 0, n: 0 }
    e.sum += v
    e.n += 1
    s.set(key(r), e)
  }
  return [...s.entries()].map(([k, e]): [string, number] => [k, e.sum / e.n]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
}

export const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v))

/** Whole months between two 'YYYY-MM-DD' dates (month granularity). */
export function monthSpan(minIso: string, maxIso: string): number {
  const [y1, m1] = minIso.split('-').map(Number)
  const [y2, m2] = maxIso.split('-').map(Number)
  return (y2 - y1) * 12 + (m2 - m1)
}

export type Coverage = { first_date: string; last_date: string; cal_months: number }

/**
 * Seasonal view is meaningful for a farm+method only when its harvests span at least 365 days
 * and touch at least 6 distinct calendar months. True if any coverage row qualifies.
 */
export function seasonalReady(rows: Coverage[]): boolean {
  return rows.some((r) => {
    const days = (Date.parse(r.last_date) - Date.parse(r.first_date)) / 86400_000
    return days >= 365 && r.cal_months >= 6
  })
}

/** First day of the month `n` months before the month of `iso`. */
export function monthsAgoFirst(iso: string, n: number): string {
  const [y, m] = iso.split('-').map(Number)
  const t = y * 12 + (m - 1) - n
  return `${String(Math.floor(t / 12)).padStart(4, '0')}-${String((t % 12) + 1).padStart(2, '0')}-01`
}

/** Same month/day `n` years earlier (29 Feb clamps to 28 Feb). */
export function yearsAgo(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const day = m === 2 && d === 29 ? 28 : d
  return `${String(y - n).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
