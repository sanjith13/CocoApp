'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changeTreeCount } from '@/app/(app)/farms/actions'

export function TreeCountForm({ farmId, today }: { farmId: string; today: string }) {
  const [state, formAction, pending] = useActionState(changeTreeCount.bind(null, farmId), null)
  const fe = state && !state.ok ? (state.fieldErrors ?? {}) : {}
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="tc">New tree count</Label>
          <Input id="tc" name="tree_count" type="number" min={0} step={1} inputMode="numeric" required className="h-11" />
          {fe.tree_count?.[0] && <p className="text-sm text-destructive">{fe.tree_count[0]}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="ed">Effective from</Label>
          <Input id="ed" name="effective_date" type="date" defaultValue={today} required className="h-11" />
        </div>
      </div>
      {state && !state.ok && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-700">Tree count updated.</p>}
      <Button type="submit" disabled={pending} className="h-12 w-full">
        {pending ? 'Saving...' : 'Change tree count'}
      </Button>
    </form>
  )
}
