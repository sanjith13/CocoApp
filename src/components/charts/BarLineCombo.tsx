'use client'

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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
  type ChartRow,
  type ChartSeries,
} from './shared'

type Props = { data: ChartRow[]; xKey: string; bars: ChartSeries[]; lines: ChartSeries[] }

/** Bars on the left axis with one or more lines (for example price) on the right axis. */
export function BarLineCombo({ data, xKey, bars, lines }: Props) {
  const all = [...bars, ...lines]
  if (!hasData(data, bars)) return <ChartEmpty />
  const units = axisUnits(all)
  return (
    <div className="h-64 w-full" role="img" aria-label={all.map((s) => s.label).join(', ')}>
      <ChartShell>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tick={axisTick} minTickGap={16} />
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
          <Tooltip contentStyle={tooltipStyle} formatter={tooltipFormatter(all)} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {bars.map((s, i) => (
            <Bar key={s.key} yAxisId={units.indexOf(s.unit)} dataKey={s.key} name={s.label} fill={colorAt(i)} radius={[3, 3, 0, 0]} />
          ))}
          {lines.map((s, i) => (
            <Line
              key={s.key}
              yAxisId={units.indexOf(s.unit)}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={colorAt(bars.length + i + 1)}
              strokeWidth={2.5}
              dot={data.length < 30}
              connectNulls
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
      </ChartShell>
    </div>
  )
}
