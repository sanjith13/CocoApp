import type { SupabaseClient } from '@supabase/supabase-js'
import { todayIST } from '@/lib/domain/dates'

export type ReportSnapshot = {
  farm: {
    name: string
    location: string | null
    acreage: number
    soilType: string | null
    trees: number | null
    varieties: { name: string; trees: number }[]
  }
  harvest: {
    date: string
    method: 'mudi' | 'ton'
    quantity: number
    unit: 'mudi' | 'ton'
    nuts?: number
    previous: { quantity: number; unit: 'mudi' | 'ton' } | null
    changePct: number | null
    rate: number | null
    revenue: number | null
    estimatedRevenue: number | null
  }
  weather: {
    avgTemp: number | null
    totalRain: number | null
    avgHumidity: number | null
    climateClass: string | null
    heatwave: boolean
    heavyRain: boolean
    daysWithData: number
    daysInPeriod: number
  }
  fertilizer: {
    used: { name: string; kg: number }[]
    nKg: number
    pKg: number
    kKg: number
    nPerTreeKg: number | null
    pPerTreeKg: number | null
    kPerTreeKg: number | null
  }
  pests: { name: string; severity: string; date: string }[]
  market: { wholeNut: number | null; dehusked: number | null; copra: number | null }
  period: { start: string; end: string }
}

const NUTS_PER_MUDI = 200
const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v))

/** First day of the month after an ISO month-start date. */
function nextMonthStart(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
}

/**
 * Climate class for a report: the class of the month containing the harvest date if that month
 * is complete (today is past its last day), otherwise the latest completed month before it.
 */
export function pickClimateClass(
  rows: { month: string; climate_class: string | null }[],
  harvestDate: string,
  today: string,
): string | null {
  const harvestMonth = `${harvestDate.slice(0, 7)}-01`
  const complete = rows
    .filter((r) => r.month <= harvestMonth && nextMonthStart(r.month) <= today)
    .sort((a, b) => (a.month < b.month ? 1 : -1))
  return complete[0]?.climate_class ?? null
}

/** Reads everything for one harvest. Period is (period_start, harvest_date]. */
export async function buildSnapshot(
  supabase: SupabaseClient,
  harvestId: string,
  today: string = todayIST(),
): Promise<ReportSnapshot> {
  const { data: h, error } = await supabase.from('harvest_stats').select('*').eq('id', harvestId).single()
  if (error || !h) throw new Error(error?.message ?? 'Harvest not found')
  const start: string = h.period_start
  const end: string = h.harvest_date

  const [farmRes, varietiesRes, weatherRes, monthsRes, fertRes, pestRes, ratesRes] = await Promise.all([
    supabase
      .from('farms_with_trees')
      .select('name, location_text, acreage, soil_type, current_tree_count')
      .eq('id', h.farm_id)
      .single(),
    supabase.from('farm_varieties').select('variety_name, tree_count').eq('farm_id', h.farm_id).order('variety_name'),
    supabase.rpc('harvest_weather', { p_harvest: harvestId }),
    supabase
      .from('weather_monthly')
      .select('month, climate_class')
      .eq('farm_id', h.farm_id)
      .lte('month', `${end.slice(0, 7)}-01`)
      .order('month', { ascending: false })
      .limit(3),
    supabase
      .from('fertilizer_npk')
      .select('fertilizer_name, quantity_kg, n_kg, p_kg, k_kg, n_per_tree_kg, p_per_tree_kg, k_per_tree_kg')
      .eq('farm_id', h.farm_id)
      .gt('date', start)
      .lte('date', end),
    supabase
      .from('pest_incidents')
      .select('pest_name, severity, date')
      .eq('farm_id', h.farm_id)
      .gt('date', start)
      .lte('date', end)
      .order('date'),
    supabase.from('latest_rates').select('rate_type, rate, date, created_at'),
  ])
  for (const r of [farmRes, varietiesRes, weatherRes, monthsRes, fertRes, pestRes, ratesRes]) {
    if (r.error) throw new Error(r.error.message)
  }
  const farm = farmRes.data!
  const w = (Array.isArray(weatherRes.data) ? weatherRes.data[0] : weatherRes.data) ?? null

  const isMudi = h.method === 'mudi'
  const toQty = (q: unknown) => (isMudi ? Number(q) / NUTS_PER_MUDI : Number(q))
  const prevQ = num(h.prev_same_method_quantity)

  const used = new Map<string, number>()
  let nKg = 0
  let pKg = 0
  let kKg = 0
  const perTree = { n: null as number | null, p: null as number | null, k: null as number | null }
  const add = (acc: number | null, v: unknown) => (v === null || v === undefined ? acc : (acc ?? 0) + Number(v))
  for (const f of fertRes.data ?? []) {
    used.set(f.fertilizer_name, (used.get(f.fertilizer_name) ?? 0) + Number(f.quantity_kg))
    nKg += Number(f.n_kg)
    pKg += Number(f.p_kg)
    kKg += Number(f.k_kg)
    perTree.n = add(perTree.n, f.n_per_tree_kg)
    perTree.p = add(perTree.p, f.p_per_tree_kg)
    perTree.k = add(perTree.k, f.k_per_tree_kg)
  }

  // Latest rate per type across the owner's markets.
  const best = new Map<string, { rate: number; key: string }>()
  for (const r of ratesRes.data ?? []) {
    const key = `${r.date}|${r.created_at}`
    const cur = best.get(r.rate_type)
    if (!cur || key > cur.key) best.set(r.rate_type, { rate: Number(r.rate), key })
  }

  return {
    farm: {
      name: farm.name,
      location: farm.location_text ?? null,
      acreage: Number(farm.acreage),
      soilType: farm.soil_type ?? null,
      trees: num(h.trees) ?? num(farm.current_tree_count),
      varieties: (varietiesRes.data ?? []).map((v) => ({ name: v.variety_name, trees: Number(v.tree_count) })),
    },
    harvest: {
      date: end,
      method: isMudi ? 'mudi' : 'ton',
      quantity: toQty(h.quantity),
      unit: isMudi ? 'mudi' : 'ton',
      ...(isMudi ? { nuts: Number(h.quantity) } : {}),
      previous: prevQ === null ? null : { quantity: toQty(prevQ), unit: isMudi ? 'mudi' : 'ton' },
      changePct: num(h.change_pct),
      rate: num(h.sale_rate),
      revenue: num(h.revenue),
      estimatedRevenue: num(h.estimated_revenue),
    },
    weather: {
      avgTemp: num(w?.avg_temp),
      totalRain: num(w?.total_rain),
      avgHumidity: num(w?.avg_humidity),
      climateClass: pickClimateClass(monthsRes.data ?? [], end, today),
      heatwave: Boolean(w?.heatwave),
      heavyRain: Boolean(w?.heavy_rain),
      daysWithData: w?.days_with_data ?? 0,
      daysInPeriod: w?.days_in_period ?? 0,
    },
    fertilizer: {
      used: [...used].map(([name, kg]) => ({ name, kg })),
      nKg,
      pKg,
      kKg,
      nPerTreeKg: perTree.n,
      pPerTreeKg: perTree.p,
      kPerTreeKg: perTree.k,
    },
    pests: (pestRes.data ?? []).map((p) => ({ name: p.pest_name, severity: p.severity, date: p.date })),
    market: {
      wholeNut: best.get('whole_nut_per_nut')?.rate ?? null,
      dehusked: best.get('dehusked_per_ton')?.rate ?? null,
      copra: best.get('copra_per_kg')?.rate ?? null,
    },
    period: { start, end },
  }
}
