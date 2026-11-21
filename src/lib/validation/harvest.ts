import { z } from 'zod'
import { blankToUndefined, isoDate, num, optionalText } from './common'

const checkbox = z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.boolean())

// A quantity belonging to the other method must be absent.
const absent = (msg: string) => z.preprocess(blankToUndefined, z.undefined({ error: msg }))

const extraNuts = z.preprocess(
  blankToUndefined,
  z.coerce
    .number({ error: 'Must be a number' })
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .max(199, 'Must be under 200 (that is another mudi)')
    .default(0),
)

const common = {
  farm_id: z.string().min(1, 'Choose a farm'),
  harvest_date: isoDate,
  sale_rate: z
    .preprocess(blankToUndefined, z.coerce.number({ error: 'Must be a number' }).positive('Must be above 0').optional()),
  save_as_market_rate: checkbox.default(false),
  market_name: optionalText,
  notes: optionalText,
}

const mudiVariant = z.object({
  ...common,
  method: z.literal('mudi'),
  mudi_count: num().pipe(
    z
      .number()
      .positive('Must be above 0')
      .refine((v) => Number.isInteger(v * 2), 'Use steps of 0.5'),
  ),
  extra_nuts: extraNuts,
  weight_ton: absent('Not allowed for the mudi method'),
})

const tonVariant = z.object({
  ...common,
  method: z.literal('ton'),
  weight_ton: num().pipe(
    z
      .number()
      .positive('Must be above 0')
      .refine((v) => Math.abs(v * 1000 - Math.round(v * 1000)) < 1e-6, 'Max 3 decimals'),
  ),
  mudi_count: absent('Not allowed for the ton method'),
})

export const harvestSchema = z
  .discriminatedUnion('method', [mudiVariant, tonVariant])
  .refine((d) => !(d.save_as_market_rate && d.sale_rate !== undefined) || !!d.market_name, {
    path: ['market_name'],
    message: 'Market name is required to save the rate',
  })

export type HarvestInput = z.infer<typeof harvestSchema>

export type HarvestRow = {
  farm_id: string
  harvest_date: string
  method: 'mudi' | 'ton'
  mudi_count: number | null
  extra_nuts: number
  weight_ton: number | null
  sale_rate: number | null
  notes: string | null
}

export type MarketRateRow = {
  market_name: string
  date: string
  rate_type: 'whole_nut_per_nut' | 'dehusked_per_ton'
  rate: number
  source: 'harvest_form'
}

export function buildHarvestWrites(input: HarvestInput): { harvest: HarvestRow; marketRate: MarketRateRow | null } {
  const harvest: HarvestRow = {
    farm_id: input.farm_id,
    harvest_date: input.harvest_date,
    method: input.method,
    mudi_count: input.method === 'mudi' ? input.mudi_count : null,
    extra_nuts: input.method === 'mudi' ? input.extra_nuts : 0,
    weight_ton: input.method === 'ton' ? input.weight_ton : null,
    sale_rate: input.sale_rate ?? null,
    notes: input.notes,
  }
  const marketRate: MarketRateRow | null =
    input.save_as_market_rate && input.sale_rate !== undefined && input.market_name
      ? {
          market_name: input.market_name,
          date: input.harvest_date,
          rate_type: input.method === 'mudi' ? 'whole_nut_per_nut' : 'dehusked_per_ton',
          rate: input.sale_rate,
          source: 'harvest_form',
        }
      : null
  return { harvest, marketRate }
}
