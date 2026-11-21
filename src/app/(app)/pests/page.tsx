import { Suspense } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { todayIST } from '@/lib/domain/dates'
import { deletePestIncident } from './actions'
import { Card } from '@/components/ui/card'
import { ConfirmDeleteButton } from '@/components/common/ConfirmDeleteButton'
import { PestForm } from '@/components/pests/PestForm'

const SEV_CLS: Record<string, string> = {
  high: 'text-red-700 dark:text-red-400',
  medium: 'text-amber-700 dark:text-amber-400',
  low: 'text-green-700 dark:text-green-400',
}

async function Incidents() {
  const supabase = await createServerClient()
  const [{ data: rows, error }, { data: farms }] = await Promise.all([
    supabase
      .from('pest_incidents')
      .select('id, farm_id, date, pest_name, severity, remarks')
      .order('date', { ascending: false })
      .limit(50),
    supabase.from('farms').select('id, name'),
  ])
  if (error) return <p className="text-destructive">{error.message}</p>
  if (!rows?.length) return <p className="text-muted-foreground">No incidents recorded.</p>
  const farmName = new Map((farms ?? []).map((f) => [f.id, f.name]))
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id}>
          <Card className="p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-medium">{r.pest_name}</span>
              <span className="text-sm text-muted-foreground">{r.date}</span>
            </div>
            <div className="text-sm text-muted-foreground">{farmName.get(r.farm_id) ?? 'Farm'}</div>
            <div className={`text-sm font-medium capitalize ${SEV_CLS[r.severity] ?? ''}`}>{r.severity} severity</div>
            {r.remarks ? <div className="text-sm">{r.remarks}</div> : null}
            <ConfirmDeleteButton id={r.id} action={deletePestIncident} />
          </Card>
        </li>
      ))}
    </ul>
  )
}

async function FormLoader() {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('farms').select('id, name').eq('active', true).order('name')
  if (error) return <p className="text-destructive">{error.message}</p>
  return <PestForm farms={data ?? []} today={todayIST()} />
}

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pests</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
        <FormLoader />
      </Suspense>
      <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
        <Incidents />
      </Suspense>
    </div>
  )
}
