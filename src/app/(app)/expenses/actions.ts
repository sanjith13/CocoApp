'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { uuidSchema } from '@/lib/validation/common'
import { expenseSchema } from '@/lib/validation/expense'

export type ExpenseActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

export async function saveExpense(_prev: ExpenseActionResult | null, form: FormData): Promise<ExpenseActionResult> {
  const parsed = expenseSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    }
  }
  const supabase = await createServerClient()
  const { error } = await supabase.from('expenses').insert(parsed.data)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/expenses')
  return { ok: true }
}

export async function deleteExpense(id: string): Promise<ExpenseActionResult> {
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) return { ok: false, error: 'Invalid expense' }
  const supabase = await createServerClient()
  const { error } = await supabase.from('expenses').delete().eq('id', parsed.data)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/expenses')
  return { ok: true }
}
