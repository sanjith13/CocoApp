'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveApplication } from '@/app/(app)/fertilizer/actions'

type Option = { id: string; name: string }
const selectCls = 'h-11 w-full rounded-lg border border-input bg-background px-3 text-base'

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? <p className="text-sm text-destructive">{errors[0]}</p> : null
}

export function ApplicationForm({ farms, fertilizers, today }: { farms: Option[]; fertilizers: Option[]; today: string }) {
  const [state, formAction, pending] = useActionState(saveApplication, null)
  const fe = state && !state.ok ? (state.fieldErrors ?? {}) : {}
  if (farms.length === 0) return <p className="text-muted-foreground">Add a farm first.</p>
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="farm_id">Farm</Label>
          <select id="farm_id" name="farm_id" className={selectCls}>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <FieldError errors={fe.farm_id} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" defaultValue={today} max={today} className="h-11" />
          <FieldError errors={fe.date} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="fertilizer_id">Fertilizer</Label>
          <select id="fertilizer_id" name="fertilizer_id" className={selectCls}>
            {fertilizers.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <FieldError errors={fe.fertilizer_id} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="quantity_kg">Quantity (kg)</Label>
          <Input id="quantity_kg" name="quantity_kg" inputMode="decimal" autoComplete="off" className="h-11" />
          <FieldError errors={fe.quantity_kg} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" name="notes" className="h-11" />
      </div>
      {state && !state.ok && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-700">Application saved.</p>}
      <Button type="submit" disabled={pending} className="h-12 w-full">
        {pending ? 'Saving...' : 'Save application'}
      </Button>
    </form>
  )
}
