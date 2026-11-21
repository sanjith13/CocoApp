import { createServerClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { LineTrend } from '@/components/charts/LineTrend'
import { BarSeries } from '@/components/charts/BarSeries'
import { BarLineCombo } from '@/components/charts/BarLineCombo'
import { StackedBars } from '@/components/charts/StackedBars'
import { ChartEmpty, type ChartRow } from '@/components/charts/shared'
import { avgBy, dayLabel, monthLabel, monthName, monthsAgoFirst, num, seasonalReady, sumBy, yearsAgo } from '@/lib/domain/dashboard'
import { todayIST } from '@/lib/domain/dates'
import { fetchAll } from '@/lib/supabase/paged'
import { RATE_LABELS, type RateType } from '@/lib/validation/market'

export type PanelProps = { farm: string | null }

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <Card className="gap-2 p-4">
      <h3 className="font-medium">{title}</h3>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      {children}
    </Card>
  )
}

// Loosely typed on purpose: the generic PostgREST builder types blow the compiler's depth limit here.
/* eslint-disable @typescript-eslint/no-explicit-any */
const farmScope = (farm: string | null) => (q: any) => (farm ? q.eq('farm_id', farm) : q)

function PanelError({ message }: { message: string }) {
  return <p className="text-destructive">{message}</p>
}

/** Merges [key, value] lists into chart rows: { x, [seriesKey]: value }. */
function toRows(xKey: string, lists: Record<string, Array<[string, number]>>, fmt: (k: string) => string): ChartRow[] {
  const keys = [...new Set(Object.values(lists).flatMap((l) => l.map(([k]) => k)))].sort()
  return keys.map((k) => {
    const row: ChartRow = { [xKey]: fmt(k) }
    for (const [s, l] of Object.entries(lists)) row[s] = l.find(([kk]) => kk === k)?.[1] ?? null
    return row
  })
}

// ---------------------------------------------------------------- Production

export async function ProductionPanel({ farm, unit }: PanelProps & { unit: 'nuts' | 'ton' }) {
  const supabase = await createServerClient()
  const method = unit === 'nuts' ? 'mudi' : 'ton'
  const u = unit === 'nuts' ? 'nuts' : 't'
  const scope = farmScope(farm)
  const today = todayIST()
  const harvestSince = yearsAgo(today, 3)
  const monthSince = monthsAgoFirst(today, 36)
  const rateType = unit === 'nuts' ? 'whole_nut_per_nut' : 'dehusked_per_ton'
  const priceUnit = unit === 'nuts' ? '₹/nut' : '₹/ton'
  const [statsDesc, monthly, yearly, seasonal, coverage, farms, prices] = await Promise.all([
    // Newest 1000 harvests in the last 3 years, reversed below for display.
    scope(
      supabase
        .from('harvest_stats')
        .select('farm_id, harvest_date, quantity, per_tree')
        .eq('method', method)
        .gte('harvest_date', harvestSince),
    )
      .order('harvest_date', { ascending: false })
      .limit(1000),
    fetchAll((a, b) =>
      scope(supabase.from('production_monthly').select('farm_id, month, quantity').eq('method', method).gte('month', monthSince))
        .order('month')
        .order('farm_id')
        .range(a, b),
    ),
    fetchAll((a, b) =>
      scope(supabase.from('production_yearly').select('farm_id, year, quantity').eq('method', method))
        .order('year')
        .order('farm_id')
        .range(a, b),
    ),
    fetchAll((a, b) =>
      scope(supabase.from('production_seasonal').select('farm_id, cal_month, avg_quantity, years').eq('method', method))
        .order('cal_month')
        .order('farm_id')
        .range(a, b),
    ),
    scope(supabase.from('production_coverage').select('first_date, last_date, cal_months').eq('method', method)).limit(1000),
    supabase.from('farms').select('id, name').limit(1000),
    // Price is shown beside production only; it never feeds revenue or quantity totals.
    fetchAll((a, b) =>
      supabase
        .from('market_monthly')
        .select('month, avg_rate')
        .eq('rate_type', rateType)
        .gte('month', monthSince)
        .order('month')
        .order('market_name')
        .range(a, b),
    ),
  ])
  const err = statsDesc.error ?? monthly.error ?? yearly.error ?? seasonal.error ?? coverage.error ?? farms.error ?? prices.error
  if (err) return <PanelError message={err.message} />
  const stats = { data: [...(statsDesc.data ?? [])].reverse() }

  const perHarvest = toRows(
    'x',
    { q: sumBy(stats.data ?? [], (r) => r.harvest_date, (r) => num(r.quantity)) },
    dayLabel,
  )
  const monthRows = toRows(
    'x',
    {
      q: sumBy(monthly.data ?? [], (r) => r.month, (r) => num(r.quantity)),
      p: avgBy(prices.data ?? [], (r) => r.month, (r) => num(r.avg_rate)),
    },
    monthLabel,
  )
  const yearRows = toRows('x', { q: sumBy(yearly.data ?? [], (r) => String(r.year), (r) => num(r.quantity)) }, (k) => k)

  const fullYear = seasonalReady(coverage.data ?? [])
  const seasonRows = toRows(
    'x',
    { q: sumBy(seasonal.data ?? [], (r) => String(r.cal_month).padStart(2, '0'), (r) => num(r.avg_quantity)) },
    (k) => monthName(Number(k)),
  )

  const names = new Map((farms.data ?? []).map((f: { id: string; name: string }) => [f.id, f.name]))
  const perFarm = avgBy(stats.data ?? [], (r) => r.farm_id, (r) => num(r.per_tree)).map(([id, v]) => ({
    x: names.get(id) ?? 'Farm',
    q: v,
  }))
  const perTreeUnit = `${u}/tree`

  return (
    <div className="space-y-4">
      <Section title="Each harvest" note={`Quantity per harvest (${u})`}>
        <LineTrend data={perHarvest} xKey="x" series={[{ key: 'q', label: 'Harvest', unit: u }]} />
      </Section>
      <Section title="Monthly production and price" note={`Bars: production (${u}). Line: average ${unit === 'nuts' ? 'whole nut' : 'dehusked'} market price (${priceUnit}).`}>
        <BarLineCombo
          data={monthRows}
          xKey="x"
          bars={[{ key: 'q', label: 'Monthly total', unit: u }]}
          lines={[{ key: 'p', label: 'Avg price', unit: priceUnit }]}
        />
      </Section>
      <Section title="Yearly production">
        <BarSeries data={yearRows} xKey="x" series={[{ key: 'q', label: 'Yearly total', unit: u }]} />
      </Section>
      <Section title="Seasonal pattern" note="Average of harvests falling in each calendar month.">
        {fullYear ? (
          <BarSeries data={seasonRows} xKey="x" series={[{ key: 'q', label: 'Average', unit: u }]} />
        ) : (
          <ChartEmpty message="Needs a full year of harvests" />
        )}
      </Section>
      {!farm && (
        <Section title="Farm comparison" note={`Average per tree (${perTreeUnit})`}>
          <BarSeries data={perFarm} xKey="x" series={[{ key: 'q', label: 'Per tree', unit: perTreeUnit }]} />
        </Section>
      )}
    </div>
  )
}

// ------------------------------------------------------------------- Weather

export async function WeatherPanel({ farm }: PanelProps) {
  const supabase = await createServerClient()
  const since = monthsAgoFirst(todayIST(), 23)
  const { data, error } = await fetchAll((a, b) =>
    farmScope(farm)(supabase.from('weather_monthly').select('farm_id, month, avg_temp, total_rain, avg_humidity').gte('month', since))
      .order('month')
      .order('farm_id')
      .range(a, b),
  )
  if (error) return <PanelError message={error.message} />
  const recent = data
  const temp = toRows('x', { v: avgBy(recent, (r) => r.month, (r) => num(r.avg_temp)) }, monthLabel)
  const rain = toRows('x', { v: avgBy(recent, (r) => r.month, (r) => num(r.total_rain)) }, monthLabel)
  const hum = toRows('x', { v: avgBy(recent, (r) => r.month, (r) => num(r.avg_humidity)) }, monthLabel)
  return (
    <div className="space-y-4">
      <Section title="Temperature" note="Monthly average">
        <LineTrend data={temp} xKey="x" series={[{ key: 'v', label: 'Avg temperature', unit: '°C' }]} />
      </Section>
      <Section title="Rainfall" note="Monthly total (average per farm when All is selected)">
        <BarSeries data={rain} xKey="x" series={[{ key: 'v', label: 'Rainfall', unit: 'mm' }]} />
      </Section>
      <Section title="Humidity" note="Monthly average">
        <LineTrend data={hum} xKey="x" series={[{ key: 'v', label: 'Humidity', unit: '%' }]} />
      </Section>
    </div>
  )
}

// ---------------------------------------------------------------- Fertilizer

export async function FertilizerPanel({ farm }: PanelProps) {
  const supabase = await createServerClient()
  const scope = farmScope(farm)
  const monthSince = monthsAgoFirst(todayIST(), 36)
  const [npk, yieldRows] = await Promise.all([
    fetchAll((a, b) =>
      scope(supabase.from('npk_monthly').select('farm_id, month, n_kg, p_kg, k_kg').gte('month', monthSince))
        .order('month')
        .order('farm_id')
        .range(a, b),
    ),
    // Nut harvests only: tons per tree is never overlaid on the same chart as nuts per tree.
    fetchAll((a, b) =>
      scope(supabase.from('harvest_stats').select('id, harvest_date, per_tree').eq('method', 'mudi').gte('harvest_date', monthSince))
        .order('harvest_date')
        .order('id')
        .range(a, b),
    ),
  ])
  const err = npk.error ?? yieldRows.error
  if (err) return <PanelError message={err.message} />
  const lists = {
    n: sumBy(npk.data ?? [], (r) => r.month, (r) => num(r.n_kg)),
    p: sumBy(npk.data ?? [], (r) => r.month, (r) => num(r.p_kg)),
    k: sumBy(npk.data ?? [], (r) => r.month, (r) => num(r.k_kg)),
  }
  const yieldList = avgBy(yieldRows.data ?? [], (r) => String(r.harvest_date).slice(0, 7) + '-01', (r) => num(r.per_tree))
  const rows = toRows('x', { ...lists, y: yieldList }, monthLabel)
  const nutrients = [
    { key: 'n', label: 'Nitrogen (N)', unit: 'kg' },
    { key: 'p', label: 'Phosphorus (P)', unit: 'kg' },
    { key: 'k', label: 'Potassium (K)', unit: 'kg' },
  ]
  return (
    <div className="space-y-4">
      <Section title="Nutrients applied" note="Monthly N, P and K in kg">
        <StackedBars data={rows} xKey="x" series={nutrients} />
      </Section>
      <Section
        title="Yield vs nutrients"
        note="Nuts per tree (nut harvests only) over nutrients applied. Weather and season also affect yield."
      >
        <StackedBars
          data={rows}
          xKey="x"
          series={nutrients}
          overlay={[{ key: 'y', label: 'Yield per tree', unit: 'nuts/tree' }]}
        />
      </Section>
    </div>
  )
}

// -------------------------------------------------------------------- Market

export async function MarketPanel({ farm }: PanelProps) {
  const supabase = await createServerClient()
  const today = todayIST()
  const since = yearsAgo(today, 1)
  const monthSince = monthsAgoFirst(today, 36)
  const [weekly, revenue] = await Promise.all([
    fetchAll((a, b) =>
      supabase
        .from('market_weekly')
        .select('market_name, rate_type, week, avg_rate')
        .gte('week', since)
        .order('week')
        .order('market_name')
        .order('rate_type')
        .range(a, b),
    ),
    fetchAll((a, b) =>
      farmScope(farm)(
        supabase.from('harvest_stats').select('id, harvest_date, revenue, estimated_revenue').gte('harvest_date', monthSince),
      )
        .order('harvest_date')
        .order('id')
        .range(a, b),
    ),
  ])
  const err = weekly.error ?? revenue.error
  if (err) return <PanelError message={err.message} />

  const types = (Object.keys(RATE_LABELS) as RateType[]).filter((t) =>
    (weekly.data ?? []).some((r: { rate_type: string }) => r.rate_type === t),
  )
  const revRows = toRows(
    'x',
    {
      actual: sumBy(revenue.data ?? [], (r) => String(r.harvest_date).slice(0, 7) + '-01', (r) => num(r.revenue)),
      estimated: sumBy(revenue.data ?? [], (r) => String(r.harvest_date).slice(0, 7) + '-01', (r) => num(r.estimated_revenue)),
    },
    monthLabel,
  )
  return (
    <div className="space-y-4">
      {types.length === 0 ? (
        <Section title="Price trend">
          <ChartEmpty message="No market rates yet. Add some on the Market page." />
        </Section>
      ) : (
        types.map((t) => {
          const subset = (weekly.data ?? []).filter((r: { rate_type: string }) => r.rate_type === t)
          const markets = [...new Set(subset.map((r: { market_name: string }) => r.market_name))] as string[]
          const lists = Object.fromEntries(
            markets.map((m, i) => [
              `m${i}`,
              avgBy(subset.filter((r: { market_name: string }) => r.market_name === m), (r) => r.week, (r) => num(r.avg_rate)),
            ]),
          )
          const unit = RATE_LABELS[t].match(/\((.+)\)/)?.[1] ?? ''
          return (
            <Section key={t} title={RATE_LABELS[t]} note="Weekly average per market">
              <LineTrend
                data={toRows('x', lists, dayLabel)}
                xKey="x"
                series={markets.map((m, i) => ({ key: `m${i}`, label: m, unit }))}
              />
            </Section>
          )
        })
      )}
      <Section title="Revenue: actual vs estimated" note="Estimated uses the latest market rate for unsold harvests. Copra is not included.">
        <BarSeries
          data={revRows}
          xKey="x"
          series={[
            { key: 'actual', label: 'Actual', unit: '₹' },
            { key: 'estimated', label: 'Estimated', unit: '₹' },
          ]}
        />
      </Section>
    </div>
  )
}

// --------------------------------------------------------------------- Pests

export async function PestsPanel({ farm }: PanelProps) {
  const supabase = await createServerClient()
  const { data, error } = await fetchAll((a, b) =>
    farmScope(farm)(supabase.from('pest_monthly').select('farm_id, month, incidents, high, medium, low'))
      .order('month')
      .order('farm_id')
      .range(a, b),
  )
  if (error) return <PanelError message={error.message} />
  const by = (k: 'incidents' | 'high' | 'medium' | 'low') =>
    sumBy(data ?? [], (r) => r.month, (r) => num(r[k]))
  const total = toRows('x', { incidents: by('incidents') }, monthLabel)
  const sev = toRows('x', { high: by('high'), medium: by('medium'), low: by('low') }, monthLabel)
  return (
    <div className="space-y-4">
      <Section title="Incidents per month">
        <BarSeries data={total} xKey="x" series={[{ key: 'incidents', label: 'Incidents', unit: 'incidents' }]} />
      </Section>
      <Section title="Severity">
        <StackedBars
          data={sev}
          xKey="x"
          series={[
            { key: 'high', label: 'High', unit: 'incidents' },
            { key: 'medium', label: 'Medium', unit: 'incidents' },
            { key: 'low', label: 'Low', unit: 'incidents' },
          ]}
        />
      </Section>
    </div>
  )
}
