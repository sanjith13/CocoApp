import { z } from 'zod'
import { isoDate, optionalText } from './common'

export const PEST_PICKS = ['Rhinoceros Beetle', 'Red Palm Weevil', 'Leaf Rot', 'Root Wilt'] as const
export const SEVERITIES = ['low', 'medium', 'high'] as const
export const CUSTOM_PEST = '__custom__'

export const pestSchema = z
  .object({
    farm_id: z.string().min(1, 'Choose a farm'),
    date: isoDate,
    pest_pick: z.string().min(1, 'Choose a pest'),
    custom_name: z.string().trim().max(80, 'Max 80 characters').optional(),
    severity: z.enum(SEVERITIES, { error: 'Choose a severity' }),
    remarks: optionalText,
  })
  .superRefine((v, ctx) => {
    if (v.pest_pick === CUSTOM_PEST && !v.custom_name) {
      ctx.addIssue({ code: 'custom', path: ['custom_name'], message: 'Enter the pest name' })
    }
  })
  .transform(({ pest_pick, custom_name, ...rest }) => ({
    ...rest,
    pest_name: pest_pick === CUSTOM_PEST ? (custom_name as string) : pest_pick,
  }))

export type PestInput = z.output<typeof pestSchema>
