import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminUser } from '@/lib/auth/admin'
import { deleteUser } from './actions'
import { Card } from '@/components/ui/card'
import { Loading } from '@/components/ui/loading'
import { ConfirmDeleteButton } from '@/components/common/ConfirmDeleteButton'
import { UserForm } from '@/components/admin/UserForm'

const fmt = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
    : 'never'

async function Users() {
  const admin = await getAdminUser()
  if (!admin) notFound()
  const { data, error } = await createAdminClient().auth.admin.listUsers({ perPage: 200 })
  if (error) return <p className="text-destructive">{error.message}</p>
  return (
    <>
      <Card className="p-4">
        <h2 className="mb-3 font-medium">Add a user</h2>
        <UserForm />
      </Card>
      <section className="space-y-2">
        <h2 className="font-medium">Users ({data.users.length})</h2>
        <ul className="space-y-3">
          {data.users.map((u) => (
            <li key={u.id}>
              <Card className="p-4">
                <div className="font-medium">{u.email}</div>
                <div className="text-sm text-muted-foreground">
                  Created {fmt(u.created_at)} · Last sign-in {fmt(u.last_sign_in_at)}
                </div>
                {u.id === admin.id ? (
                  <div className="text-sm text-primary">You</div>
                ) : (
                  <ConfirmDeleteButton id={u.id} action={deleteUser} label="Remove user" />
                )}
              </Card>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">Removing a user also deletes all of their farms and records.</p>
      </section>
    </>
  )
}

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">👥 Users</h1>
      <Suspense fallback={<Loading />}>
        <Users />
      </Suspense>
    </div>
  )
}
