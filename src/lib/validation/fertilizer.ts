import { z } from 'zod'
import { blankToUndefined, isoDate, num, optionalText } from './common'

export const applicationSchema = z.object({
  farm_id: z.string().min(1, 'Choose a farm'),
  date: isoDate,
  fertilizer_id: z.string().min(1, 'Choose a fertilizer'),
  quantity_kg: num().pipe(z.number().positive('Must be above 0').max(99999999, 'Too large')),
  notes: optionalText,
})

const pct = () =>
  z.preprocess(
    blankToUndefined,
    z.coerce.number({ error: 'Must be a number' }).min(0, 'Min 0').max(100, 'Max 100').default(0),
  )

export const fertilizerSchema = z.object({
  name: z.string().trim().min(1, 'Required'),
  n_pct: pct(),
  p_pct: pct(),
  k_pct: pct(),
})

export type ApplicationInput = z.infer<typeof applicationSchema>
export type FertilizerInput = z.infer<typeof fertilizerSchema>
