'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { todayIST } from '@/lib/domain/dates'
import { farmSchema, treeCountChangeSchema, varietySchema } from '@/lib/validation/farm'

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

function fail(error: z.ZodError): ActionResult {
  return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]> }
}

/** Creates a farm and its first tree-count row; rolls the farm back if the row fails. */
export async function createFarm(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = farmSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) return fail(parsed.error)
  const { tree_count, ...farmFields } = parsed.data
  const supabase = await createServerClient()
  const { data: farm, error } = await supabase.from('farms').insert(farmFields).select('id').single()
  if (error || !farm) return { ok: false, error: error?.message ?? 'Could not create farm' }
  const { error: tcError } = await supabase
    .from('farm_tree_counts')
    .insert({ farm_id: farm.id, effective_date: todayIST(), tree_count })
  if (tcError) {
    await supabase.from('farms').delete().eq('id', farm.id)
    return { ok: false, error: tcError.message }
  }
  revalidatePath('/farms')
  redirect(`/farms/${farm.id}`)
}

export async function updateFarm(farmId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = farmSchema.omit({ tree_count: true }).safeParse(Object.fromEntries(form))
  if (!parsed.success) return fail(parsed.error)
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('farms')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', farmId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/farms')
  revalidatePath(`/farms/${farmId}`)
  return { ok: true, id: farmId }
}

/** Records the tree count effective from a date (upsert on farm + date). */
export async function changeTreeCount(
  farmId: string,
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const parsed = treeCountChangeSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) return fail(parsed.error)
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('farm_tree_counts')
    .upsert(
      { farm_id: farmId, effective_date: parsed.data.effective_date, tree_count: parsed.data.tree_count },
      { onConflict: 'farm_id,effective_date' },
    )
  if (error) return { ok: false, error: error.message }
  revalidatePath('/farms')
  revalidatePath(`/farms/${farmId}`)
  return { ok: true }
}

/** Replaces a farm's variety rows: inserts the new set first, then removes the old ones. */
export async function upsertVarieties(
  farmId: string,
  rows: Array<{ variety_name: string; tree_count: number }>,
): Promise<ActionResult> {
  const parsed = z.array(varietySchema).safeParse(rows)
  if (!parsed.success) return fail(parsed.error)
  const supabase = await createServerClient()
  const { data: old, error: readError } = await supabase.from('farm_varieties').select('id').eq('farm_id', farmId)
  if (readError) return { ok: false, error: readError.message }
  if (parsed.data.length > 0) {
    const { error } = await supabase
      .from('farm_varieties')
      .insert(parsed.data.map((r) => ({ farm_id: farmId, ...r })))
    if (error) return { ok: false, error: error.message }
  }
  const oldIds = (old ?? []).map((r) => r.id)
  if (oldIds.length > 0) {
    const { error } = await supabase.from('farm_varieties').delete().in('id', oldIds)
    if (error) return { ok: false, error: error.message }
  }
  revalidatePath(`/farms/${farmId}`)
  return { ok: true }
}
