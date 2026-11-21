import { T } from '@/lib/i18n/client'
import { Loading } from '@/components/ui/loading'
import { Suspense } from 'react'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { formatINR, formatPct } from '@/lib/domain/format'
import { monthName, num } from '@/lib/domain/dashboard'
import { KpiCard } from '@/components/kpi/KpiCard'
import { Card } from '@/components/ui/card'
import {
  FertilizerPanel,
  MarketPanel,
  PestsPanel,
  ProductionPanel,
  WeatherPanel,
} from '@/components/dashboard/panels'

type SP = { farm?: string; tab?: string; unit?: string }

const TABS = [
  ['production', 'Production'],
  ['weather', 'Weather'],
  ['fertilizer', 'Fertilizer'],
  ['market', 'Market'],
  ['pests', 'Pests'],
] as const

function href(sp: { farm: string | null; tab: string; unit: string }) {
  const p = new URLSearchParams()
  if (sp.farm) p.set('farm', sp.farm)
  p.set('tab', sp.tab)
  if (sp.tab === 'production') p.set('unit', sp.unit)
  return `/dashboard?${p.toString()}`
}

const pill = (active: boolean) =>
  `shrink-0 rounded-full border px-3 py-1.5 text-sm ${active ? 'bg-primary text-primary-foreground' : 'bg-background'}`

const qty = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })
const rate = (n: number | null) => (n === null ? '—' : `₹${qty.format(n)}`)

async function Kpis({ farm }: { farm: string | null }) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc('dashboard_kpis', { p_farm: farm })
  if (error) return <p className="text-destructive">{error.message}</p>
  const k = Array.isArray(data) ? data[0] : data
  if (!k) return null
  const monthLabelText = k.month_class_month ? monthName(Number(String(k.month_class_month).slice(5, 7))) : null
  const last = num(k.last_harvest_qty)
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <KpiCard label="Farms" value={String(k.total_farms)} />
      <KpiCard label="Trees" value={qty.format(k.total_trees)} />
      <KpiCard
        label="Last harvest"
        value={last === null ? '—' : `${qty.format(last)} ${k.last_harvest_unit === 'ton' ? 't' : 'nuts'}`}
        sub={last === null ? undefined : `${formatPct(num(k.last_change_pct))} vs previous`}
      />
      <KpiCard label="Revenue this year" value={formatINR(num(k.revenue_ytd))} sub="Sold harvests only" />
      <KpiCard
        label="Avg temperature"
        value={num(k.month_avg_temp) === null ? '—' : `${num(k.month_avg_temp)!.toFixed(1)} °C`}
        sub="this month so far"
      />
      <KpiCard
        label={monthLabelText ? `${monthLabelText} rainfall` : 'Last month rainfall'}
        value={k.month_class ? k.month_class[0].toUpperCase() + k.month_class.slice(1) : '—'}
        sub="vs 10-year normal"
      />
      <KpiCard label="Whole nut" value={rate(num(k.rate_whole_nut))} sub="per nut" />
      <KpiCard label="Dehusked" value={rate(num(k.rate_dehusked))} sub="per ton" />
      <KpiCard label="Copra" value={rate(num(k.rate_copra))} sub="per kg" />
    </div>
  )
}

async function Body({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams
  const supabase = await createServerClient()
  const { data: farms, error } = await supabase.from('farms').select('id, name').eq('active', true).order('name')
  if (error) return <p className="text-destructive">{error.message}</p>
  if (!farms?.length) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">No farms yet. Add your first farm to see insights here.</p>
        <Link href="/farms/new" className="mt-2 inline-block underline">
          Add a farm
        </Link>
      </Card>
    )
  }
  const farm = farms.some((f) => f.id === sp.farm) ? (sp.farm as string) : null
  const tab = TABS.some(([t]) => t === sp.tab) ? (sp.tab as string) : 'production'
  const unit = sp.unit === 'ton' ? 'ton' : 'nuts'
  const cur = { farm, tab, unit }
  const fallback = <Loading />
  return (
    <div className="space-y-4">
      <nav aria-label="Farm" className="-mx-4 flex gap-2 overflow-x-auto px-4">
        <Link href={href({ ...cur, farm: null })} className={pill(!farm)}>
          <T>All farms</T>
        </Link>
        {farms.map((f) => (
          <Link key={f.id} href={href({ ...cur, farm: f.id })} className={pill(farm === f.id)}>
            {f.name}
          </Link>
        ))}
      </nav>
      <Suspense fallback={fallback}>
        <Kpis farm={farm} />
      </Suspense>
      <nav aria-label="Panels" className="-mx-4 flex gap-2 overflow-x-auto px-4">
        {TABS.map(([t, label]) => (
          <Link key={t} href={href({ ...cur, tab: t })} className={pill(tab === t)}>
            <T>{label}</T>
          </Link>
        ))}
      </nav>
      {tab === 'production' && (
        <nav aria-label="Unit" className="flex gap-2">
          <Link href={href({ ...cur, unit: 'nuts' })} className={pill(unit === 'nuts')}>
            <T>Nuts (mudi)</T>
          </Link>
          <Link href={href({ ...cur, unit: 'ton' })} className={pill(unit === 'ton')}>
            <T>Tons</T>
          </Link>
        </nav>
      )}
      <Suspense key={`${tab}-${farm}-${unit}`} fallback={fallback}>
        {tab === 'production' && <ProductionPanel farm={farm} unit={unit} />}
        {tab === 'weather' && <WeatherPanel farm={farm} />}
        {tab === 'fertilizer' && <FertilizerPanel farm={farm} />}
        {tab === 'market' && <MarketPanel farm={farm} />}
        {tab === 'pests' && <PestsPanel farm={farm} />}
      </Suspense>
    </div>
  )
}

export default function Page({ searchParams }: { searchParams: Promise<SP> }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">🏠 <T>Dashboard</T></h1>
      <Suspense fallback={<Loading />}>
        <Body searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
