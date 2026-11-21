export type ChartRow = Record<string, number | string | null>
export type ChartSeries = { key: string; label: string; unit: string }
export type ChartProps = { data: ChartRow[]; xKey: string; series: ChartSeries[] }

export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]
export const colorAt = (i: number) => CHART_COLORS[i % CHART_COLORS.length]

const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 })
const full = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })
export const formatTick = (v: unknown) => (typeof v === 'number' ? compact.format(v) : String(v))
export const formatValue = (v: unknown) => (typeof v === 'number' ? full.format(v) : String(v ?? '—'))

/** Distinct units in order of first appearance; the first goes on the left axis, the second on the right. */
export function axisUnits(series: ChartSeries[]): string[] {
  return [...new Set(series.map((s) => s.unit))].slice(0, 2)
}

export function hasData(data: ChartRow[], series: ChartSeries[]): boolean {
  return data.some((r) => series.some((s) => typeof r[s.key] === 'number'))
}

export function ChartEmpty({ message = 'No data yet for this chart.' }: { message?: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm text-muted-foreground">
      {message}
    </div>
  )
}

export const tooltipStyle = {
  backgroundColor: 'var(--popover)',
  color: 'var(--popover-foreground)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
}
export const axisTick = { fontSize: 11, fill: 'var(--muted-foreground)' }
export const gridStroke = 'var(--border)'

export function tooltipFormatter(series: ChartSeries[]) {
  const unitOf = new Map(series.map((s) => [s.label, s.unit]))
  return (value: unknown, name: unknown) => [
    `${formatValue(value)} ${unitOf.get(String(name)) ?? ''}`.trim(),
    String(name),
  ]
}
