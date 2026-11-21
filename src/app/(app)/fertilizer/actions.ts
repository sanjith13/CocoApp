'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { applicationSchema, fertilizerSchema } from '@/lib/validation/fertilizer'

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
