import { Suspense } from 'react'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'

async function ReportList() {
  const supabase = await createServerClient()
  const [{ data: rows, error }, { data: farms }] = await Promise.all([
    supabase
      .from('reports')
      .select('harvest_id, farm_id, period_start, period_end')
      .order('period_end', { ascending: false })
      .limit(200),
    supabase.from('farms').select('id, name').order('name'),
  ])
  if (error) return <p className="text-destructive">{error.message}</p>
  if (!rows?.length) return <p className="text-muted-foreground">No reports yet. Saving a harvest creates one.</p>

  return (
    <div className="space-y-6">
      {(farms ?? [])
        .map((f) => ({ farm: f, reports: rows.filter((r) => r.farm_id === f.id) }))
        .filter((g) => g.reports.length > 0)
        .map(({ farm, reports }) => (
          <section key={farm.id} className="space-y-2">
            <h2 className="font-medium">{farm.name}</h2>
            <ul className="space-y-2">
              {reports.map((r) => (
                <li key={r.harvest_id}>
                  <Link href={`/reports/${r.harvest_id}`}>
                    <Card className="flex items-baseline justify-between p-4">
                      <span className="font-medium">Harvest {r.period_end}</span>
                      <span className="text-sm text-muted-foreground">
                        {r.period_start} to {r.period_end}
                      </span>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  )
}

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">📄 Reports</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
        <ReportList />
      </Suspense>
    </div>
  )
}
