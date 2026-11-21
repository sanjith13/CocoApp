import { Suspense } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { todayIST } from '@/lib/domain/dates'
import { MarketRateForm } from '@/components/market/MarketRateForm'
import { RATE_LABELS, mergeMarketNames, type RateType } from '@/lib/validation/market'

function RateTable({
  title,
  rows,
}: {
  title: string
  rows: Array<{ id?: string; market_name: string; rate_type: string; rate: number; date: string }>
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-medium">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No rates yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="p-2">Market</th>
                <th className="p-2">Type</th>
                <th className="p-2 text-right">Rate</th>
                <th className="p-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id ?? `${r.market_name}-${r.rate_type}-${i}`} className="border-t">
                  <td className="p-2">{r.market_name}</td>
                  <td className="p-2">{RATE_LABELS[r.rate_type as RateType] ?? r.rate_type}</td>
                  <td className="p-2 text-right">{r.rate}</td>
                  <td className="p-2">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

async function MarketContent() {
  const supabase = await createServerClient()
  const [latest, recent] = await Promise.all([
    supabase.from('latest_rates').select('market_name, rate_type, rate, date').order('market_name'),
    supabase
      .from('market_rates')
      .select('id, market_name, rate_type, rate, date')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(30),
  ])
  const err = latest.error ?? recent.error
  if (err) return <p className="text-destructive">{err.message}</p>
  const names = mergeMarketNames((recent.data ?? []).map((r) => r.market_name))
  return (
    <>
      <MarketRateForm marketNames={names} today={todayIST()} />
      <RateTable title="Latest rates" rows={latest.data ?? []} />
      <RateTable title="Recent entries" rows={recent.data ?? []} />
    </>
  )
}

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Market rates</h1>
      <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
        <MarketContent />
      </Suspense>
    </div>
  )
}
