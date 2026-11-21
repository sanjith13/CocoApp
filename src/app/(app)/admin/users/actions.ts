'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminUser } from '@/lib/auth/admin'
import { uuidSchema } from '@/lib/validation/common'

export type UserActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

const newUserSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email')),
  password: z.string().min(8, 'At least 8 characters').max(72, 'At most 72 characters'),
})

/** Creates a confirmed user. Only admins (ADMIN_EMAILS) may call this. */
export async function createUser(_prev: UserActionResult | null, form: FormData): Promise<UserActionResult> {
  if (!(await getAdminUser())) return { ok: false, error: 'Not allowed' }
  const parsed = newUserSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Please fix the highlighted fields.',
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    }
  }
  const { error } = await createAdminClient().auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/users')
  return { ok: true }
}

/** Deletes a user and, by cascade, all of their farms and records. Admins cannot delete themselves. */
export async function deleteUser(id: string): Promise<UserActionResult> {
  const admin = await getAdminUser()
  if (!admin) return { ok: false, error: 'Not allowed' }
  const parsed = uuidSchema.safeParse(id)
  if (!parsed.success) return { ok: false, error: 'Invalid user' }
  if (parsed.data === admin.id) return { ok: false, error: 'You cannot delete your own account' }
  const { error } = await createAdminClient().auth.admin.deleteUser(parsed.data)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/admin/users')
  return { ok: true }
}
