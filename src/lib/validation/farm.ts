import { z } from 'zod'
import { blankToUndefined, num, optionalText } from './common'

const count = z.preprocess(
  blankToUndefined,
  z.coerce.number({ error: 'Required' }).int('Must be a whole number').min(0, 'Cannot be negative'),
)

export const farmSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80, 'Max 80 characters'),
  location_text: optionalText,
  latitude: num().pipe(z.number().min(-90).max(90)),
  longitude: num().pipe(z.number().min(-180).max(180)),
  acreage: num().pipe(z.number().min(0, 'Cannot be negative')),
  tree_count: count,
  soil_type: optionalText,
})

export const varietySchema = z.object({
  variety_name: z.string().trim().min(1, 'Variety name is required').max(80),
  tree_count: count,
})

export const treeCountChangeSchema = z.object({
  tree_count: count,
  effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
})

export type FarmInput = z.infer<typeof farmSchema>
export type VarietyInput = z.infer<typeof varietySchema>
