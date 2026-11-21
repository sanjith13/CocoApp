'use client'

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChartEmpty,
  axisTick,
  colorAt,
  formatTick,
  gridStroke,
  hasData,
  tooltipFormatter,
  tooltipStyle,
  type ChartProps,
  type ChartSeries,
} from './shared'

/**
 * Stacked bars sharing one unit. An optional `overlay` series (a different unit) is drawn as a
 * line against a right-hand axis, e.g. yield per tree over fertilizer kg.
 */
export function StackedBars({ data, xKey, series, overlay }: ChartProps & { overlay?: ChartSeries[] }) {
  const all = [...series, ...(overlay ?? [])]
  if (!hasData(data, series)) return <ChartEmpty />
  const barUnit = series[0]?.unit ?? ''
  const lineUnit = overlay?.[0]?.unit
  const showOverlay = !!overlay?.length && hasData(data, overlay)
  return (
    <div className="h-64 w-full" role="img" aria-label={all.map((s) => s.label).join(', ')}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tick={axisTick} minTickGap={16} />
          <YAxis
            yAxisId={0}
            tick={axisTick}
            tickFormatter={formatTick}
            width={52}
            label={{ value: barUnit, angle: -90, position: 'insideLeft', fontSize: 11, fill: 'var(--muted-foreground)' }}
          />
          {showOverlay && (
            <YAxis
              yAxisId={1}
              orientation="right"
              tick={axisTick}
              tickFormatter={formatTick}
              width={52}
              label={{ value: lineUnit, angle: 90, position: 'insideRight', fontSize: 11, fill: 'var(--muted-foreground)' }}
            />
          )}
          <Tooltip contentStyle={tooltipStyle} formatter={tooltipFormatter(all)} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s, i) => (
            <Bar key={s.key} yAxisId={0} stackId="a" dataKey={s.key} name={s.label} fill={colorAt(i)} />
          ))}
          {showOverlay &&
            overlay!.map((s, i) => (
              <Line
                key={s.key}
                yAxisId={1}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={colorAt(series.length + i)}
                strokeWidth={2}
                connectNulls
              />
            ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
