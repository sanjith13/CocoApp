'use server'

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { generateReportsAround } from '@/lib/reports/generate'
import { uuidSchema } from '@/lib/validation/common'

export type ReportActionResult = { ok: true } | { ok: false; error: string }

/** Rebuilds the report for one harvest (and the farm's next harvest) with the RLS client. */
export async function regenerateReport(harvestId: string): Promise<ReportActionResult> {
  const id = uuidSchema.safeParse(harvestId)
  if (!id.success) return { ok: false, error: 'Invalid harvest' }
  const supabase = await createServerClient()
  try {
    await generateReportsAround(supabase, { harvestId: id.data })
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not generate the report' }
  }
  revalidatePath('/reports')
  revalidatePath(`/reports/${id.data}`)
  return { ok: true }
}
