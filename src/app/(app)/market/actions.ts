'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { marketRateSchema } from '@/lib/validation/market'

export type MarketActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

/** Manual market-rate entry; user_id comes from the database default (auth.uid()). */
export async function addMarketRate(_prev: MarketActionResult | null, form: FormData): Promise<MarketActionResult> {
  const parsed = marketRateSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    }
  }
  const supabase = await createServerClient()
  const { error } = await supabase.from('market_rates').insert({ ...parsed.data, source: 'manual' })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/market')
  return { ok: true }
}
