/** Nuts from mudi count (1 mudi = 200 nuts) plus loose extras; matches SQL. */
export function nutsFromMudi(mudi: number, extra = 0): number {
  return Math.round(mudi * 200) + extra
}

/** Live form preview of revenue; same formula as the harvests generated column. */
export function previewRevenue(
  method: 'mudi' | 'ton',
  qty: number,
  extra: number,
  rate: number | null,
): number | null {
  if (rate === null) return null
  return method === 'mudi' ? nutsFromMudi(qty, extra) * rate : qty * rate
}
