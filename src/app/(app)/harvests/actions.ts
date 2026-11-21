'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { buildHarvestWrites, harvestSchema } from '@/lib/validation/harvest'

export type HarvestActionResult =
  | { ok: true; id?: string; warning?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

const DUPLICATE = 'A harvest already exists for this farm on this date'

/** Inserts or updates a harvest (id in the form means update) and its linked market rate. */
export async function saveHarvest(_prev: HarvestActionResult | null, form: FormData): Promise<HarvestActionResult> {
  const raw = Object.fromEntries(form)
  const parsed = harvestSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    }
  }
  const { harvest, marketRate } = buildHarvestWrites(parsed.data)
  const editId = typeof raw.id === 'string' && raw.id ? raw.id : null
  const supabase = await createServerClient()

  let harvestId: string
  if (editId) {
    const { error } = await supabase
      .from('harvests')
      .update({ ...harvest, updated_at: new Date().toISOString() })
      .eq('id', editId)
    if (error) return harvestError(error)
    harvestId = editId
  } else {
    const { data, error } = await supabase.from('harvests').insert(harvest).select('id').single()
    if (error || !data) return harvestError(error)
    harvestId = data.id
  }

  // The harvest is the important record: a failed rate write only produces a warning.
  let warning: string | undefined
  const { data: existing } = await supabase
    .from('market_rates')
    .select('id')
    .eq('harvest_id', harvestId)
    .eq('source', 'harvest_form')
    .maybeSingle()
  if (marketRate) {
    const { error } = existing
      ? await supabase.from('market_rates').update(marketRate).eq('id', existing.id)
      : await supabase.from('market_rates').insert({ ...marketRate, harvest_id: harvestId })
    if (error) warning = `Harvest saved, but the market rate was not: ${error.message}`
  } else if (existing) {
    const { error } = await supabase.from('market_rates').delete().eq('id', existing.id)
    if (error) warning = `Harvest saved, but the old market rate was not removed: ${error.message}`
  }

  revalidatePath('/harvests')
  revalidatePath('/market')
  revalidatePath(`/harvests/${harvestId}`)
  if (warning) return { ok: true, id: harvestId, warning }
  redirect('/harvests')
}

function harvestError(error: { code?: string; message: string } | null): HarvestActionResult {
  if (error?.code === '23505') {
    return { ok: false, error: DUPLICATE, fieldErrors: { harvest_date: [DUPLICATE] } }
  }
  return { ok: false, error: error?.message ?? 'Could not save harvest' }
}

export async function deleteHarvest(id: string): Promise<HarvestActionResult> {
  const supabase = await createServerClient()
  const { error } = await supabase.from('harvests').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/harvests')
  revalidatePath('/market')
  redirect('/harvests')
}
