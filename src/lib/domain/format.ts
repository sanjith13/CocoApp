const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

export function formatINR(n: number | null): string {
  return n === null ? '—' : `₹${inr.format(n)}`
}

export function formatPct(n: number | null): string {
  if (n === null) return '—'
  return `${n >= 0 ? '▲' : '▼'} ${Math.abs(n).toFixed(1)}%`
}
