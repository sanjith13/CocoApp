'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { upsertVarieties } from '@/app/(app)/farms/actions'

type Row = { variety_name: string; tree_count: string }

export function VarietyEditor({
  farmId,
  initial,
  currentTreeCount,
}: {
  farmId: string
  initial: Array<{ variety_name: string; tree_count: number }>
  currentTreeCount: number
}) {
  const [rows, setRows] = useState<Row[]>(
    initial.map((r) => ({ variety_name: r.variety_name, tree_count: String(r.tree_count) })),
  )
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const total = rows.reduce((s, r) => s + (Number(r.tree_count) || 0), 0)

  function update(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  }

  function save() {
    start(async () => {
      const res = await upsertVarieties(
        farmId,
        rows.map((r) => ({ variety_name: r.variety_name, tree_count: Number(r.tree_count) })),
      )
      setMsg(res.ok ? 'Saved.' : res.error)
    })
  }

  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2">
          <Input aria-label="Variety name" value={r.variety_name} onChange={(e) => update(i, { variety_name: e.target.value })} placeholder="Variety" className="h-11" />
          <Input aria-label="Trees" type="number" min={0} step={1} inputMode="numeric" value={r.tree_count} onChange={(e) => update(i, { tree_count: e.target.value })} className="h-11 w-24" />
          <Button type="button" variant="outline" className="h-11" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label="Remove variety">
            X
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" className="h-11 w-full" onClick={() => setRows((rs) => [...rs, { variety_name: '', tree_count: '0' }])}>
        Add variety
      </Button>
      {rows.length > 0 && total !== currentTreeCount && (
        <p className="text-sm text-amber-700">
          Variety total ({total}) does not match current tree count ({currentTreeCount}).
        </p>
      )}
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      <Button type="button" onClick={save} disabled={pending} className="h-12 w-full">
        {pending ? 'Saving...' : 'Save varieties'}
      </Button>
    </div>
  )
}
