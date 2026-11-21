'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RATE_LABELS, RATE_TYPES } from '@/lib/validation/market'
import { addMarketRate } from '@/app/(app)/market/actions'

const CUSTOM = '__custom__'

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? <p className="text-sm text-destructive">{errors[0]}</p> : null
}

export function MarketRateForm({ marketNames, today }: { marketNames: string[]; today: string }) {
  const [state, formAction, pending] = useActionState(addMarketRate, null)
  const fe = state && !state.ok ? (state.fieldErrors ?? {}) : {}
  const [pick, setPick] = useState(marketNames[0] ?? CUSTOM)
  const [custom, setCustom] = useState('')
  const [rateType, setRateType] = useState<string>(RATE_TYPES[0])
  const [rate, setRate] = useState('')
  const [date, setDate] = useState(today)
  const name = pick === CUSTOM ? custom : pick

  return (
    <form action={formAction} className="space-y-3 rounded-lg border p-3">
      <input type="hidden" name="market_name" value={name} />
      <div className="space-y-1">
        <Label htmlFor="market_pick">Market</Label>
        <select
          id="market_pick"
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base"
        >
          {marketNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
          <option value={CUSTOM}>Other market...</option>
        </select>
        {pick === CUSTOM && (
          <Input
            aria-label="Market name"
            placeholder="Market name"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="h-11"
          />
        )}
        <FieldError errors={fe.market_name} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="rate_type">Rate type</Label>
        <select
          id="rate_type"
          name="rate_type"
          value={rateType}
          onChange={(e) => setRateType(e.target.value)}
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base"
        >
          {RATE_TYPES.map((t) => (
            <option key={t} value={t}>
              {RATE_LABELS[t]}
            </option>
          ))}
        </select>
        <FieldError errors={fe.rate_type} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="rate">Rate</Label>
          <Input
            id="rate"
            name="rate"
            inputMode="decimal"
            autoComplete="off"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="h-11"
          />
          <FieldError errors={fe.rate} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
          <FieldError errors={fe.date} />
        </div>
      </div>
      {state && !state.ok && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-700">Rate saved.</p>}
      <Button type="submit" disabled={pending} className="h-12 w-full">
        {pending ? 'Saving...' : 'Add rate'}
      </Button>
    </form>
  )
}
