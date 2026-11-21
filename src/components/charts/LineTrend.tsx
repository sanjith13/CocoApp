'use client'

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartShell } from './ChartShell'
import {
  ChartEmpty,
  axisTick,
  axisUnits,
  colorAt,
  formatTick,
  gridStroke,
  hasData,
  tooltipFormatter,
  tooltipStyle,
  type ChartProps,
} from './shared'

export function LineTrend({ data, xKey, series }: ChartProps) {
  if (!hasData(data, series)) return <ChartEmpty />
  const units = axisUnits(series)
  return (
    <div className="h-64 w-full" role="img" aria-label={series.map((s) => s.label).join(', ')}>
      <ChartShell>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tick={axisTick} minTickGap={24} />
          {units.map((u, i) => (
            <YAxis
              key={u}
              yAxisId={i}
              orientation={i === 0 ? 'left' : 'right'}
              tick={axisTick}
              tickFormatter={formatTick}
              width={52}
              label={{ value: u, angle: i === 0 ? -90 : 90, position: i === 0 ? 'insideLeft' : 'insideRight', fontSize: 11, fill: 'var(--muted-foreground)' }}
            />
          ))}
          <Tooltip contentStyle={tooltipStyle} formatter={tooltipFormatter(series)} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
          {series.map((s, i) => (
            <Line
              key={s.key}
              yAxisId={units.indexOf(s.unit)}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={colorAt(i)}
              strokeWidth={2}
              dot={data.length < 30}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      </ChartShell>
    </div>
  )
}
