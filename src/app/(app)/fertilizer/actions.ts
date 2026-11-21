'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { uuidSchema } from '@/lib/validation/common'
import { applicationSchema, fertilizerSchema } from '@/lib/validation/fertilizer'
import { applicationIdSchema } from '@/lib/validation/fertilizer-effect'

export type FertilizerActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

function invalid(error: z.ZodError): FertilizerActionResult {
  return {
    ok: false,
    error: 'Please fix the highlighted fields.',
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]>,
  }
}

export async function saveApplication(
  _prev: FertilizerActionResult | null,
  form: FormData,
): Promise<FertilizerActionResult> {
  const parsed = applicationSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) return invalid(parsed.error)
  const supabase = await createServerClient()
  const { error } = await supabase.from('fertilizer_applications').insert(parsed.data)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/fertilizer')
  return { ok: true }
}

export async function saveFertilizer(
  _prev: FertilizerActionResult | null,
  form: FormData,
): Promise<FertilizerActionResult> {
  const parsed = fertilizerSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) return invalid(parsed.error)
  const supabase = await createServerClient()
  const { error } = await supabase.from('fertilizer_master').insert(parsed.data)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/fertilizer/master')
  revalidatePath('/fertilizer')
  return { ok: true }
}

export type EffectRow = {
  method: string
  window_label: string
  harvests: number
  avg_per_tree: number | null
  change_pct: number | null
}

/** Loads the before/after rows for one application (RLS client), on demand. */
export async function getFertilizerEffect(
  applicationId: string,
): Promise<{ ok: true; rows: EffectRow[] } | { ok: false; error: string }> {
  const id = applicationIdSchema.safeParse(applicationId)
  if (!id.success) return { ok: false, error: 'Invalid application' }
  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc('fertilizer_effect', { p_application: id.data })
  if (error) return { ok: false, error: error.message }
  return { ok: true, rows: (data ?? []) as EffectRow[] }
}

export async function deleteApplication(id: string): Promise<FertilizerActionResult> {
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) return { ok: false, error: 'Invalid application' }
  const supabase = await createServerClient()
  const { error } = await supabase.from('fertilizer_applications').delete().eq('id', parsed.data)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/fertilizer')
  return { ok: true }
}
