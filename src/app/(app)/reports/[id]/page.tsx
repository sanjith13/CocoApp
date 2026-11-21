import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { PromptActions } from '@/components/reports/PromptActions'
import { RegenerateButton } from '@/components/reports/RegenerateButton'
import { formatINR, formatPct } from '@/lib/domain/format'
import type { ReportSnapshot } from '@/lib/reports/snapshot'

const formatGenerated = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))

const dash = (n: number | null, dp: number) => (n === null ? '—' : n.toFixed(dp))

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-1 p-4 text-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </Card>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  )
}

async function Report({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  // The route id is the harvest id.
  const { data, error } = await supabase
    .from('reports')
    .select('snapshot, prompt_text, generated_at')
    .eq('harvest_id', id)
    .maybeSingle()
  if (error) return <p className="text-destructive">{error.message}</p>
  if (!data) {
    const { data: harvest, error: hErr } = await supabase.from('harvests').select('id').eq('id', id).maybeSingle()
    if (hErr) return <p className="text-destructive">{hErr.message}</p>
    if (!harvest) notFound()
    return (
      <Section title="No report yet">
        <p className="text-muted-foreground">This harvest has no report. Generate one from the saved data.</p>
        <RegenerateButton harvestId={id} label="Generate report" />
      </Section>
    )
  }
  const s = data.snapshot as ReportSnapshot
  const h = s.harvest
  const w = s.weather
  const f = s.fertilizer
  const qty = `${h.quantity} ${h.unit}${h.nuts !== undefined ? ` (${h.nuts.toLocaleString('en-IN')} nuts)` : ''}`

  const generatedOn = formatGenerated(data.generated_at)

  return (
    <>
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">Generated {generatedOn}</span>
        <RegenerateButton harvestId={id} label={`Regenerate report (generated ${generatedOn})`} />
      </div>
      <Section title="Farm">
        <Row k="Name" v={s.farm.name} />
        <Row k="Location" v={s.farm.location ?? '—'} />
        <Row k="Area" v={`${s.farm.acreage} acres`} />
        <Row k="Soil" v={s.farm.soilType ?? '—'} />
        <Row k="Trees" v={s.farm.trees ?? '—'} />
        {s.farm.varieties.length > 0 && (
          <Row k="Varieties" v={s.farm.varieties.map((v) => `${v.name} ${v.trees}`).join(', ')} />
        )}
      </Section>
      <Section title="Harvest">
        <Row k="Date" v={h.date} />
        <Row k="Quantity" v={qty} />
        <Row k="Previous" v={h.previous ? `${h.previous.quantity} ${h.previous.unit}` : '—'} />
        <Row k="Change" v={formatPct(h.changePct)} />
        <Row k="Period" v={`${s.period.start} to ${s.period.end}`} />
        <Row
          k="Revenue"
          v={h.revenue !== null ? formatINR(h.revenue) : h.estimatedRevenue !== null ? `est. ${formatINR(h.estimatedRevenue)}` : '—'}
        />
      </Section>
      <Section title="Weather">
        {w.daysWithData < w.daysInPeriod && (
          <p className="text-amber-700">
            Weather data for {w.daysWithData} of {w.daysInPeriod} days
          </p>
        )}
        <Row k="Avg temperature" v={w.avgTemp === null ? '—' : `${w.avgTemp.toFixed(1)}°C`} />
        <Row k="Rainfall" v={w.totalRain === null ? '—' : `${w.totalRain.toFixed(0)} mm`} />
        <Row k="Avg humidity" v={w.avgHumidity === null ? '—' : `${w.avgHumidity.toFixed(0)}%`} />
        <Row k="Climate" v={w.climateClass ?? '—'} />
        {w.heatwave && <p>Heatwave during the period</p>}
        {w.heavyRain && <p>Heavy rain day during the period</p>}
      </Section>
      <Section title="Fertilizer">
        {f.used.length === 0 ? (
          <p className="text-muted-foreground">None applied in this period.</p>
        ) : (
          f.used.map((u) => <Row key={u.name} k={u.name} v={`${u.kg} kg`} />)
        )}
        <Row k="N / P / K" v={`${f.nKg.toFixed(1)} / ${f.pKg.toFixed(1)} / ${f.kKg.toFixed(1)} kg`} />
        <Row
          k="Per tree"
          v={`${dash(f.nPerTreeKg, 4)} / ${dash(f.pPerTreeKg, 4)} / ${dash(f.kPerTreeKg, 4)} kg`}
        />
      </Section>
      <Section title="Pests">
        {s.pests.length === 0 ? (
          <p className="text-muted-foreground">None reported.</p>
        ) : (
          s.pests.map((p, i) => <Row key={i} k={`${p.name} (${p.severity})`} v={p.date} />)
        )}
      </Section>
      <Section title={`Market (rates as of ${generatedOn.split(',')[0]})`}>
        <Row k="Whole nut" v={s.market.wholeNut === null ? '—' : `${formatINR(s.market.wholeNut)}/nut`} />
        <Row k="Dehusked" v={s.market.dehusked === null ? '—' : `${formatINR(s.market.dehusked)}/ton`} />
        <Row k="Copra" v={s.market.copra === null ? '—' : `${formatINR(s.market.copra)}/kg`} />
      </Section>
      <Section title="AI prompt">
        <PromptActions prompt={data.prompt_text} />
      </Section>
    </>
  )
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between">
        <h1 className="text-xl font-semibold">📄 Harvest report</h1>
        <Link href="/reports" className="text-sm underline">
          All reports
        </Link>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
        <Report params={params} />
      </Suspense>
    </div>
  )
}
