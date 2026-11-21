'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { uuidSchema } from '@/lib/validation/common'
import { pestSchema } from '@/lib/validation/pest'

export type PestActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

export async function savePestIncident(
  _prev: PestActionResult | null,
  form: FormData,
): Promise<PestActionResult> {
  const parsed = pestSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    }
  }
  const supabase = await createServerClient()
  const { error } = await supabase.from('pest_incidents').insert(parsed.data)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/pests')
  revalidatePath('/dashboard')
  return { ok: true }
}

export async function deletePestIncident(id: string): Promise<PestActionResult> {
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) return { ok: false, error: 'Invalid incident' }
  const supabase = await createServerClient()
  const { error } = await supabase.from('pest_incidents').delete().eq('id', parsed.data)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/pests')
  revalidatePath('/dashboard')
  return { ok: true }
}
