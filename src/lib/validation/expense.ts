import { z } from 'zod'
import { isoDate, num, optionalText } from './common'

export const EXPENSE_CATEGORIES = ['labour', 'fertilizer', 'pesticide', 'irrigation', 'transport', 'equipment', 'other'] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const expenseSchema = z.object({
  farm_id: z.string().min(1, 'Choose a farm'),
  date: isoDate,
  category: z.enum(EXPENSE_CATEGORIES, { error: 'Choose a category' }),
  amount: num().pipe(z.number().positive('Must be above 0').max(99999999, 'Too large')),
  notes: optionalText,
})

export type ExpenseInput = z.output<typeof expenseSchema>
