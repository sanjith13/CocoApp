import { T } from '@/lib/i18n/client'
import { Loading } from '@/components/ui/loading'
import { Suspense } from 'react'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { todayIST } from '@/lib/domain/dates'
import { Card } from '@/components/ui/card'
import { ApplicationForm } from '@/components/fertilizer/ApplicationForm'
import { ConfirmDeleteButton } from '@/components/common/ConfirmDeleteButton'
import { deleteApplication } from './actions'
import { EffectTable } from '@/components/fertilizer/EffectTable'

const dash = (n: number | null, digits: number) => (n === null ? '—' : Number(n).toFixed(digits))

async function Applications() {
  const supabase = await createServerClient()
  const [{ data: rows, error }, { data: farms }] = await Promise.all([
    supabase
      .from('fertilizer_npk')
      .select('id, farm_id, date, fertilizer_name, quantity_kg, n_kg, p_kg, k_kg, n_per_tree_kg, p_per_tree_kg, k_per_tree_kg')
      .order('date', { ascending: false })
      .limit(50),
    supabase.from('farms').select('id, name'),
  ])
  if (error) return <p className="text-destructive">{error.message}</p>
  if (!rows?.length) return <p className="text-muted-foreground">No applications yet.</p>
  const farmName = new Map((farms ?? []).map((f) => [f.id, f.name]))
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id}>
          <Card className="p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-medium">
                {r.fertilizer_name} · {Number(r.quantity_kg)} kg
              </span>
              <span className="text-sm text-muted-foreground">{r.date}</span>
            </div>
            <div className="text-sm text-muted-foreground">{farmName.get(r.farm_id) ?? 'Farm'}</div>
            <div className="mt-1 text-sm">
              N {Number(r.n_kg)} / P {Number(r.p_kg)} / K {Number(r.k_kg)} kg
            </div>
            <div className="text-sm text-muted-foreground">
              Per tree: N {dash(r.n_per_tree_kg, 4)} / P {dash(r.p_per_tree_kg, 4)} / K {dash(r.k_per_tree_kg, 4)} kg
            </div>
            <EffectTable applicationId={r.id} />
            <ConfirmDeleteButton id={r.id} action={deleteApplication} />
          </Card>
        </li>
      ))}
    </ul>
  )
}

async function FormLoader() {
  const supabase = await createServerClient()
  const [farms, ferts] = await Promise.all([
    supabase.from('farms').select('id, name').eq('active', true).order('name'),
    supabase.from('fertilizer_master').select('id, name').order('name'),
  ])
  if (farms.error) return <p className="text-destructive">{farms.error.message}</p>
  return <ApplicationForm farms={farms.data ?? []} fertilizers={ferts.data ?? []} today={todayIST()} />
}

export default function Page() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">🌱 <T>Fertilizer</T></h1>
        <Link href="/fertilizer/master" className="text-sm underline">
          Manage fertilizers
        </Link>
      </div>
      <Suspense fallback={<Loading />}>
        <FormLoader />
      </Suspense>
      <Suspense fallback={<Loading />}>
        <Applications />
      </Suspense>
    </div>
  )
}
