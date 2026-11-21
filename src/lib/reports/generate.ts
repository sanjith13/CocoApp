import type { SupabaseClient } from '@supabase/supabase-js'
import { buildSnapshot } from './snapshot'
import { renderPrompt } from './prompt'

export type GenerateInput = {
  /** Harvest to (re)generate, plus the farm's next harvest after its date. */
  harvestId?: string
  /** Required when harvestId is absent (delete). */
  farmId?: string
  /** Extra dates (old date after an edit, deleted date): regenerate the next harvest after each. */
  extraAfterDates?: string[]
}

async function nextHarvestId(supabase: SupabaseClient, farmId: string, after: string): Promise<string | null> {
  const { data } = await supabase
    .from('harvests')
    .select('id')
    .eq('farm_id', farmId)
    .gt('harvest_date', after)
    .order('harvest_date', { ascending: true })
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}

/** Builds the snapshot and prompt for one harvest and upserts its report (one per harvest). */
export async function generateReport(supabase: SupabaseClient, harvestId: string, farmId: string): Promise<void> {
  const snapshot = await buildSnapshot(supabase, harvestId)
  const { error } = await supabase.from('reports').upsert(
    {
      farm_id: farmId,
      harvest_id: harvestId,
      period_start: snapshot.period.start,
      period_end: snapshot.period.end,
      snapshot,
      prompt_text: renderPrompt(snapshot),
      generated_at: new Date().toISOString(),
    },
    { onConflict: 'harvest_id' },
  )
  if (error) throw new Error(error.message)
}

/**
 * Regenerates the report for a harvest and for the farm's next harvest (whose period start may
 * have moved). Written through the caller's RLS client.
 */
export async function generateReportsAround(supabase: SupabaseClient, input: GenerateInput): Promise<void> {
  const targets: string[] = []
  const push = (id: string | null) => {
    if (id && !targets.includes(id)) targets.push(id)
  }
  let farmId = input.farmId

  if (input.harvestId) {
    const { data: h, error } = await supabase
      .from('harvests')
      .select('id, farm_id, harvest_date')
      .eq('id', input.harvestId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!h) throw new Error('Harvest not found')
    farmId = h.farm_id
    push(h.id)
    push(await nextHarvestId(supabase, h.farm_id, h.harvest_date))
  }
  if (farmId) {
    for (const d of input.extraAfterDates ?? []) push(await nextHarvestId(supabase, farmId, d))
  }
  const errors: string[] = []
  for (const id of targets) {
    try {
      await generateReport(supabase, id, farmId!)
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e))
    }
  }
  if (errors.length) throw new Error(errors.join('; '))
}
