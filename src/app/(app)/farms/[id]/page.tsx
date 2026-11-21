import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { todayIST } from '@/lib/domain/dates'
import { FarmForm } from '@/components/farms/FarmForm'
import { TreeCountForm } from '@/components/farms/TreeCountForm'
import { VarietyEditor } from '@/components/farms/VarietyEditor'
import { updateFarm } from '../actions'

async function FarmDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()
  const [{ data: farm }, { data: history }, { data: varieties }] = await Promise.all([
    supabase.from('farms_with_trees').select('*').eq('id', id).maybeSingle(),
    supabase.from('farm_tree_counts').select('effective_date, tree_count').eq('farm_id', id).order('effective_date', { ascending: false }),
    supabase.from('farm_varieties').select('variety_name, tree_count').eq('farm_id', id).order('variety_name'),
  ])
  if (!farm) notFound()
  const current = farm.current_tree_count ?? 0
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">{farm.name}</h1>
        <p className="text-sm text-muted-foreground">
          {current} trees · {farm.acreage} acres
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">Tree count history</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1">Effective from</th>
              <th className="py-1 text-right">Trees</th>
            </tr>
          </thead>
          <tbody>
            {(history ?? []).map((h) => (
              <tr key={h.effective_date} className="border-t">
                <td className="py-2">{h.effective_date}</td>
                <td className="py-2 text-right">{h.tree_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <TreeCountForm farmId={id} today={todayIST()} />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Varieties</h2>
        <VarietyEditor farmId={id} initial={varieties ?? []} currentTreeCount={current} />
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Farm details</h2>
        <FarmForm action={updateFarm.bind(null, id)} farm={farm} submitLabel="Save changes" />
      </section>
    </div>
  )
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
      <FarmDetail params={params} />
    </Suspense>
  )
}
