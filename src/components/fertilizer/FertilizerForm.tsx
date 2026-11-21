'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveFertilizer } from '@/app/(app)/fertilizer/actions'

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? <p className="text-sm text-destructive">{errors[0]}</p> : null
}

export function FertilizerForm() {
  const [state, formAction, pending] = useActionState(saveFertilizer, null)
  const fe = state && !state.ok ? (state.fieldErrors ?? {}) : {}
  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" className="h-11" />
        <FieldError errors={fe.name} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {(['n_pct', 'p_pct', 'k_pct'] as const).map((k) => (
          <div key={k} className="space-y-1">
            <Label htmlFor={k}>{k[0].toUpperCase()} %</Label>
            <Input id={k} name={k} inputMode="decimal" autoComplete="off" placeholder="0" className="h-11" />
            <FieldError errors={fe[k]} />
          </div>
        ))}
      </div>
      {state && !state.ok && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-700">Fertilizer added.</p>}
      <Button type="submit" disabled={pending} className="h-12 w-full">
        {pending ? 'Saving...' : 'Add fertilizer'}
      </Button>
    </form>
  )
}
