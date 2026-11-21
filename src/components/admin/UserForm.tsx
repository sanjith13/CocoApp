'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createUser } from '@/app/(app)/admin/users/actions'

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? <p className="text-sm text-destructive">{errors[0]}</p> : null
}

export function UserForm() {
  const [state, formAction, pending] = useActionState(createUser, null)
  const fe = state && !state.ok ? (state.fieldErrors ?? {}) : {}
  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="off" className="h-11" required />
        <FieldError errors={fe.email} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Temporary password</Label>
        <Input id="password" name="password" type="text" autoComplete="off" minLength={8} className="h-11" required />
        <FieldError errors={fe.password} />
        <p className="text-xs text-muted-foreground">Share it with the farmer; they can keep using it to sign in.</p>
      </div>
      {state && !state.ok && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-primary">User created.</p>}
      <Button type="submit" disabled={pending} className="h-12 w-full">
        {pending ? 'Creating...' : 'Add user'}
      </Button>
    </form>
  )
}
