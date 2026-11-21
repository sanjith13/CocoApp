import Link from 'next/link'
import { getAdminUser } from '@/lib/auth/admin'

/** Renders the Users link for admins only (server side check); nothing for everyone else. */
export async function AdminLink({ className }: { className?: string }) {
  if (!(await getAdminUser())) return null
  return (
    <Link href="/admin/users" className={className}>
      <span aria-hidden className="mr-2">
        👥
      </span>
      Users
    </Link>
  )
}
