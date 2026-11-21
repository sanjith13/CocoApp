'use client'

import { useActionState, useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { nutsFromMudi, previewRevenue } from '@/lib/domain/harvest'
import { formatINR } from '@/lib/domain/format'
import type { HarvestActionResult } from '@/app/(app)/harvests/actions'

export type FarmOption = { id: string; name: string; lastMethod: 'mudi' | 'ton' | null }

export type HarvestInitial = {
  id: string
  farm_id: string
  harvest_date: string
  method: 'mudi' | 'ton'
  mudi_count: number | null
  extra_nuts: number
  weight_ton: number | null
  sale_rate: number | null
  notes: string | null
  linked_market_name: string | null
}

type Props = {
  action: (prev: HarvestActionResult | null, form: FormData) => Promise<HarvestActionResult>
  farms: FarmOption[]
  today: string
  marketNames: string[]
  lastMarket: string
  initial?: HarvestInitial
  submitLabel: string
}

const LAST_FARM_KEY = 'coco.lastFarm'

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? <p className="text-sm text-destructive">{errors[0]}</p> : null
}

function readLastFarm(): string | null {
  try {
    return localStorage.getItem(LAST_FARM_KEY)
  } catch {
    return null
  }
}

const noopSubscribe = () => () => {}

function writeLastFarm(id: string) {
  try {
    localStorage.setItem(LAST_FARM_KEY, id)
  } catch {
    // storage unavailable (private mode); the default just will not persist
  }
}

export function HarvestForm({ action, farms, today, marketNames, lastMarket, initial, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, null)
  const fe = state && !state.ok ? (state.fieldErrors ?? {}) : {}

  // Last-used farm from localStorage: null on the server and during hydration, then the stored id.
  const storedFarm = useSyncExternalStore(noopSubscribe, readLastFarm, () => null)
  const [farmOverride, setFarmOverride] = useState<string | null>(null)
  const defaultFarm = !initial ? farms.find((f) => f.id === storedFarm) : undefined
  const farmId = farmOverride ?? initial?.farm_id ?? defaultFarm?.id ?? farms[0]?.id ?? ''
  const farmLastMethod = farms.find((f) => f.id === farmId)?.lastMethod ?? null
  const [methodOverride, setMethod] = useState<'mudi' | 'ton' | null>(null)
  const method: 'mudi' | 'ton' = methodOverride ?? initial?.method ?? farmLastMethod ?? 'mudi'
  const [date, setDate] = useState(initial?.harvest_date ?? today)
  const [mudi, setMudi] = useState(initial?.mudi_count != null ? String(initial.mudi_count) : '')
  const [extra, setExtra] = useState(initial && initial.extra_nuts ? String(initial.extra_nuts) : '')
  const [ton, setTon] = useState(initial?.weight_ton != null ? String(initial.weight_ton) : '')
  const [rate, setRate] = useState(initial?.sale_rate != null ? String(initial.sale_rate) : '')
  const [saveOverride, setSaveOverride] = useState<boolean | null>(initial ? initial.linked_market_name !== null : null)
  const [market, setMarket] = useState(initial?.linked_market_name ?? lastMarket)
  const [notes, setNotes] = useState(initial?.notes ?? '')

  function pickFarm(id: string) {
    setFarmOverride(id)
    if (!initial) setMethod(null) // fall back to the picked farm's last-used method
  }

  const rateNum = rate.trim() === '' || Number.isNaN(Number(rate)) ? null : Number(rate)
  const saveRate = saveOverride ?? rateNum !== null
  const qty = Number(method === 'mudi' ? mudi : ton)
  const extraNum = Number(extra) || 0
  const hasQty = (method === 'mudi' ? mudi : ton).trim() !== '' && Number.isFinite(qty) && qty > 0
  const nuts = method === 'mudi' && hasQty ? nutsFromMudi(qty, extraNum) : null
  const revenue = hasQty ? previewRevenue(method, qty, extraNum, rateNum) : null

  if (farms.length === 0) {
    return <p className="text-muted-foreground">Add a farm first, then log harvests.</p>
  }

  return (
    <form action={formAction} onSubmit={() => writeLastFarm(farmId)} className="space-y-3">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="farm_id">Farm</Label>
          <select
            id="farm_id"
            name="farm_id"
            value={farmId}
            onChange={(e) => pickFarm(e.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base"
          >
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <FieldError errors={fe.farm_id} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="harvest_date">Date</Label>
          <Input
            id="harvest_date"
            name="harvest_date"
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="h-11"
          />
        </div>
      </div>
      <FieldError errors={fe.harvest_date} />

      <div role="radiogroup" aria-label="Harvest method" className="grid grid-cols-2 gap-2">
        {(['mudi', 'ton'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={method === m}
            onClick={() => setMethod(m)}
            className={`h-11 rounded-lg border text-base font-medium ${
              method === m ? 'border-primary bg-primary text-primary-foreground' : 'bg-background'
            }`}
          >
            {m === 'mudi' ? 'Mudi (whole nuts)' : 'Ton (dehusked)'}
          </button>
        ))}
      </div>
      <input type="hidden" name="method" value={method} />

      {method === 'mudi' ? (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="mudi_count">Mudi (1 mudi = 200 nuts)</Label>
            <Input
              id="mudi_count"
              name="mudi_count"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={mudi}
              onChange={(e) => setMudi(e.target.value)}
              className="h-16 text-center text-3xl font-semibold"
            />
            <FieldError errors={fe.mudi_count} />
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="extra_nuts" className="shrink-0">
              Extra nuts
            </Label>
            <Input
              id="extra_nuts"
              name="extra_nuts"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              className="h-11 w-28"
            />
            <p className="ml-auto text-lg font-semibold" aria-live="polite">
              {nuts !== null ? `= ${nuts.toLocaleString('en-IN')} nuts` : ''}
            </p>
          </div>
          <FieldError errors={fe.extra_nuts} />
        </div>
      ) : (
        <div className="space-y-1">
          <Label htmlFor="weight_ton">Weight (tons)</Label>
          <Input
            id="weight_ton"
            name="weight_ton"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.000"
            value={ton}
            onChange={(e) => setTon(e.target.value)}
            className="h-16 text-center text-3xl font-semibold"
          />
          <FieldError errors={fe.weight_ton} />
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="sale_rate">Sale rate ({method === 'mudi' ? '₹/nut' : '₹/ton'}, optional)</Label>
        <div className="flex items-center gap-3">
          <Input
            id="sale_rate"
            name="sale_rate"
            inputMode="decimal"
            autoComplete="off"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="h-11 w-32"
          />
          <p className="ml-auto text-lg font-semibold" aria-live="polite">
            {revenue !== null ? formatINR(revenue) : ''}
          </p>
        </div>
        <FieldError errors={fe.sale_rate} />
      </div>

      {rateNum !== null && (
        <div className="space-y-2 rounded-lg border p-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="save_as_market_rate"
              checked={saveRate}
              onChange={(e) => setSaveOverride(e.target.checked)}
              className="size-5"
            />
            Save as market rate
          </label>
          {saveRate && (
            <div className="space-y-1">
              <Label htmlFor="market_name">Market name</Label>
              <Input
                id="market_name"
                name="market_name"
                list="market-names"
                value={market}
                onChange={(e) => setMarket(e.target.value)}
                className="h-11"
              />
              <datalist id="market-names">
                {marketNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              <FieldError errors={fe.market_name} />
            </div>
          )}
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="h-11" />
      </div>

      {state && !state.ok && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && state.warning && <p className="text-sm text-amber-700">{state.warning}</p>}
      <Button type="submit" disabled={pending} className="h-12 w-full">
        {pending ? 'Saving...' : submitLabel}
      </Button>
    </form>
  )
}
