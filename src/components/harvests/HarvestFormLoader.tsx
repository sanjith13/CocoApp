import { createServerClient } from '@/lib/supabase/server'
import { todayIST } from '@/lib/domain/dates'
import { HarvestForm, type HarvestInitial } from './HarvestForm'
import { mergeMarketNames } from '@/lib/validation/market'
import { saveHarvest } from '@/app/(app)/harvests/actions'

/** Loads farms, last-used methods and market names, then renders the form. Must sit inside Suspense. */
export async function HarvestFormLoader({ harvestId }: { harvestId?: string }) {
  const supabase = await createServerClient()
  const [farmsRes, lastRes, ratesRes] = await Promise.all([
    supabase.from('farms').select('id, name').eq('active', true).order('name'),
    supabase.from('harvests').select('farm_id, method').order('harvest_date', { ascending: false }).limit(200),
    supabase
      .from('market_rates')
      .select('market_name')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100),
  ])
  if (farmsRes.error) return <p className="text-destructive">{farmsRes.error.message}</p>

  const lastMethod = new Map<string, 'mudi' | 'ton'>()
  for (const h of lastRes.data ?? []) if (!lastMethod.has(h.farm_id)) lastMethod.set(h.farm_id, h.method)
  const farms = (farmsRes.data ?? []).map((f) => ({ id: f.id, name: f.name, lastMethod: lastMethod.get(f.id) ?? null }))

  const recentNames = [...new Set((ratesRes.data ?? []).map((r) => r.market_name))]
  const marketNames = mergeMarketNames(recentNames)

  let initial: HarvestInitial | undefined
  if (harvestId) {
    const [{ data: h, error }, { data: linked }] = await Promise.all([
      supabase
        .from('harvests')
        .select('id, farm_id, harvest_date, method, mudi_count, extra_nuts, weight_ton, sale_rate, notes')
        .eq('id', harvestId)
        .maybeSingle(),
      supabase
        .from('market_rates')
        .select('market_name')
        .eq('harvest_id', harvestId)
        .eq('source', 'harvest_form')
        .maybeSingle(),
    ])
    if (error) return <p className="text-destructive">{error.message}</p>
    if (!h) return <p className="text-muted-foreground">Harvest not found.</p>
    initial = { ...h, linked_market_name: linked?.market_name ?? null }
  }

  return (
    <HarvestForm
      action={saveHarvest}
      farms={farms}
      today={todayIST()}
      marketNames={marketNames}
      lastMarket={recentNames[0] ?? ''}
      initial={initial}
      submitLabel={initial ? 'Save changes' : 'Save harvest'}
    />
  )
}
