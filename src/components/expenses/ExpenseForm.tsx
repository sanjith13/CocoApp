'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveExpense } from '@/app/(app)/expenses/actions'
import { EXPENSE_CATEGORIES } from '@/lib/validation/expense'
import { T, useT } from '@/lib/i18n/client'

type Option = { id: string; name: string }
const selectCls = 'h-11 w-full rounded-lg border border-input bg-background px-3 text-base'
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? <p className="text-sm text-destructive">{errors[0]}</p> : null
}

export function ExpenseForm({ farms, today }: { farms: Option[]; today: string }) {
  const [state, formAction, pending] = useActionState(saveExpense, null)
  const t = useT()
  const fe = state && !state.ok ? (state.fieldErrors ?? {}) : {}
  if (farms.length === 0) return <p className="text-muted-foreground"><T>Add a farm first.</T></p>
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="farm_id"><T>Farm</T></Label>
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
          <Label htmlFor="date"><T>Date</T></Label>
          <Input id="date" name="date" type="date" defaultValue={today} max={today} className="h-11" />
          <FieldError errors={fe.date} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="category"><T>Category</T></Label>
          <select id="category" name="category" className={selectCls} defaultValue="labour">
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(cap(c))}
              </option>
            ))}
          </select>
          <FieldError errors={fe.category} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="amount"><T>Amount (₹)</T></Label>
          <Input id="amount" name="amount" type="number" inputMode="decimal" step="0.01" min="0" className="h-11" />
          <FieldError errors={fe.amount} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="notes"><T>Notes (optional)</T></Label>
        <Input id="notes" name="notes" className="h-11" />
      </div>
      {state && !state.ok && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-primary"><T>Expense saved.</T></p>}
      <Button type="submit" disabled={pending} className="h-12 w-full">
        {pending ? t('Saving...') : t('Save expense')}
      </Button>
    </form>
  )
}
