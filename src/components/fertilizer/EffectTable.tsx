'use client'

import { Loading } from '@/components/ui/loading'
import { useState } from 'react'
import { getFertilizerEffect, type EffectRow } from '@/app/(app)/fertilizer/actions'
import { formatPct } from '@/lib/domain/format'

const CAPTION = 'Before/after comparison — weather and season also affect yield.'
const dash = (n: number | null, digits: number) => (n === null ? '—' : Number(n).toFixed(digits))

type State = { s: 'idle' } | { s: 'loading' } | { s: 'error'; error: string } | { s: 'done'; rows: EffectRow[] }

/** Collapsible before/after section; the analysis loads on first open. */
export function EffectTable({ applicationId }: { applicationId: string }) {
  const [state, setState] = useState<State>({ s: 'idle' })

  async function load() {
    setState({ s: 'loading' })
    try {
      const res = await getFertilizerEffect(applicationId)
      setState(res.ok ? { s: 'done', rows: res.rows } : { s: 'error', error: res.error })
    } catch {
      setState({ s: 'error', error: 'Could not load the comparison' })
    }
  }

  return (
    <details
      className="mt-2"
      onToggle={(e) => {
        if (e.currentTarget.open && (state.s === 'idle' || state.s === 'error')) void load()
      }}
    >
      <summary className="cursor-pointer text-sm underline">Before/after</summary>
      <div className="mt-2">
        {state.s === 'loading' && <Loading label="Loading comparison…" className="py-3" />}
        {state.s === 'error' && <p className="text-sm text-destructive">{state.error}</p>}
        {state.s === 'done' && state.rows.length === 0 && (
          <p className="text-sm text-muted-foreground">not enough harvests yet</p>
        )}
        {state.s === 'done' && state.rows.length > 0 && (
          <div className="space-y-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1">Unit</th>
                  <th>Window (months)</th>
                  <th>Harvests</th>
                  <th>Avg / tree</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {state.rows.map((r) => (
                  <tr key={`${r.method}-${r.window_label}`}>
                    <td className="py-1">{r.method === 'mudi' ? 'Nuts' : 'Tons'}</td>
                    <td>{r.window_label === 'baseline' ? 'Before (90 days)' : r.window_label}</td>
                    {r.harvests === 0 ? (
                      <td colSpan={3} className="text-muted-foreground">
                        not enough harvests yet
                      </td>
                    ) : (
                      <>
                        <td>{r.harvests}</td>
                        <td>{dash(r.avg_per_tree, r.method === 'mudi' ? 1 : 4)}</td>
                        <td>{r.window_label === 'baseline' ? '—' : formatPct(r.change_pct)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground">{CAPTION}</p>
          </div>
        )}
      </div>
    </details>
  )
}
