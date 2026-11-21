import { z } from 'zod'
import { isoDate, num } from './common'

export const RATE_TYPES = ['whole_nut_per_nut', 'dehusked_per_ton', 'copra_per_kg'] as const
export type RateType = (typeof RATE_TYPES)[number]

export const RATE_LABELS: Record<RateType, string> = {
  whole_nut_per_nut: 'Whole nut (₹/nut)',
  dehusked_per_ton: 'Dehusked (₹/ton)',
  copra_per_kg: 'Copra (₹/kg)',
}

export const DEFAULT_MARKETS = ['Kangayam', 'Pollachi', 'Udumalpet'] as const

/** Default markets first, then any other names from recent entries; case-insensitive dedupe. */
export function mergeMarketNames(recent: readonly string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const n of [...DEFAULT_MARKETS, ...recent]) {
    const k = n.trim().toLowerCase()
    if (k && !seen.has(k)) {
      seen.add(k)
      out.push(n.trim())
    }
  }
  return out
}

export const marketRateSchema = z.object({
  market_name: z.string().trim().min(1, 'Market name is required').max(80, 'Max 80 characters'),
  date: isoDate,
  rate_type: z.enum(RATE_TYPES, { error: 'Choose a rate type' }),
  rate: num().pipe(z.number().positive('Must be above 0')),
})

export type MarketRateInput = z.infer<typeof marketRateSchema>
