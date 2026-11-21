import { z } from 'zod'
import { isoDate, num, optionalText } from './common'

export const EXPENSE_CATEGORIES = ['labour', 'fertilizer', 'pesticide', 'irrigation', 'transport', 'equipment', 'other'] as const

export const expenseSchema = z.object({
  farm_id: z.string().min(1, 'Choose a farm'),
  date: isoDate,
  // Free text so farmers can add their own; stored lowercase so "Labour" and "labour" group together.
  category: z
    .string()
    .trim()
    .min(1, 'Enter a category')
    .max(40, 'Max 40 characters')
    .transform((v) => v.toLowerCase()),
  amount: num().pipe(z.number().positive('Must be above 0').max(99999999, 'Too large')),
  notes: optionalText,
})

export type ExpenseInput = z.output<typeof expenseSchema>
