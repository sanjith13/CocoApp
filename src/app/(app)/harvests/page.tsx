import { T } from '@/lib/i18n/client'
import { Loading } from '@/components/ui/loading'
import { Suspense } from 'react'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { formatINR, formatPct } from '@/lib/domain/format'

async function HarvestList() {
  const supabase = await createServerClient()
  const [{ data: rows, error }, { data: farms }] = await Promise.all([
    supabase
      .from('harvest_stats')
      .select('id, farm_id, harvest_date, method, quantity, unit, revenue, estimated_revenue, change_pct')
      .order('harvest_date', { ascending: false })
      .limit(100),
    supabase.from('farms').select('id, name'),
  ])
  if (error) return <p className="text-destructive">{error.message}</p>
  if (!rows?.length) return <p className="text-muted-foreground">No harvests yet. Log your first one.</p>

  const farmName = new Map((farms ?? []).map((f) => [f.id, f.name]))
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const qty = r.unit === 'nuts' ? `${Number(r.quantity).toLocaleString('en-IN')} nuts` : `${Number(r.quantity)} ton`
        const est = r.estimated_revenue
        return (
          <li key={r.id}>
            <Link href={`/harvests/${r.id}`}>
              <Card className="p-4">
                <div className="flex items-baseline justify-between">
                  <span className="font-medium">{farmName.get(r.farm_id) ?? 'Farm'}</span>
                  <span className="text-sm text-muted-foreground">{r.harvest_date}</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-lg font-semibold">{qty}</span>
                  <span className="text-sm">{formatPct(r.change_pct)}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {r.revenue !== null ? formatINR(r.revenue) : est !== null ? `est. ${formatINR(est)}` : 'No rate yet'}
                </div>
              </Card>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export default function Page() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">🧺 <T>Harvests</T></h1>
        <Link href="/harvests/new" className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-primary-foreground">
          Add harvest
        </Link>
      </div>
      <Suspense fallback={<Loading />}>
        <HarvestList />
      </Suspense>
    </div>
  )
}
