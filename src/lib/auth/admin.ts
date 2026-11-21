import 'server-only'
import { createServerClient } from '@/lib/supabase/server'

/** Admin emails come from ADMIN_EMAILS (comma separated). Unset means nobody is an admin. */
export function adminEmails(raw: string | undefined = process.env.ADMIN_EMAILS): string[] {
  return (raw ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string | null | undefined, raw?: string): boolean {
  return !!email && adminEmails(raw).includes(email.toLowerCase())
}

/** The signed-in user if they are an admin, otherwise null. Always re-checked server side. */
export async function getAdminUser() {
  const supabase = await createServerClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user
  return user && isAdminEmail(user.email) ? user : null
}
