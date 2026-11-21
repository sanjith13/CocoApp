'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { savePestIncident } from '@/app/(app)/pests/actions'
import { CUSTOM_PEST, PEST_PICKS, SEVERITIES } from '@/lib/validation/pest'

type Option = { id: string; name: string }
const selectCls = 'h-11 w-full rounded-lg border border-input bg-background px-3 text-base'

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? <p className="text-sm text-destructive">{errors[0]}</p> : null
}

export function PestForm({ farms, today }: { farms: Option[]; today: string }) {
  const [state, formAction, pending] = useActionState(savePestIncident, null)
  const [pick, setPick] = useState<string>(PEST_PICKS[0])
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
          <Label htmlFor="pest_pick">Pest / disease</Label>
          <select
            id="pest_pick"
            name="pest_pick"
            className={selectCls}
            value={pick}
            onChange={(e) => setPick(e.target.value)}
          >
            {PEST_PICKS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
            <option value={CUSTOM_PEST}>Other (custom)</option>
          </select>
          <FieldError errors={fe.pest_pick} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="severity">Severity</Label>
          <select id="severity" name="severity" className={selectCls} defaultValue="medium">
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <FieldError errors={fe.severity} />
        </div>
      </div>
      {pick === CUSTOM_PEST && (
        <div className="space-y-1">
          <Label htmlFor="custom_name">Pest name</Label>
          <Input id="custom_name" name="custom_name" className="h-11" autoComplete="off" />
          <FieldError errors={fe.custom_name} />
        </div>
      )}
      <div className="space-y-1">
        <Label htmlFor="remarks">Remarks (optional)</Label>
        <Input id="remarks" name="remarks" className="h-11" />
      </div>
      {state && !state.ok && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-700">Incident saved.</p>}
      <Button type="submit" disabled={pending} className="h-12 w-full">
        {pending ? 'Saving...' : 'Save incident'}
      </Button>
    </form>
  )
}
