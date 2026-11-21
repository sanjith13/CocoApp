import { Suspense } from 'react'
import { createServerClient } from '@/lib/supabase/server'
import { todayIST } from '@/lib/domain/dates'
import { formatINR } from '@/lib/domain/format'
import { deleteExpense } from './actions'
import { Card } from '@/components/ui/card'
import { Loading } from '@/components/ui/loading'
import { ConfirmDeleteButton } from '@/components/common/ConfirmDeleteButton'
import { ExpenseForm } from '@/components/expenses/ExpenseForm'
import { T } from '@/lib/i18n/client'

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

async function FormLoader() {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('farms').select('id, name').eq('active', true).order('name')
  if (error) return <p className="text-destructive">{error.message}</p>
  return <ExpenseForm farms={data ?? []} today={todayIST()} />
}

async function Summary() {
  const supabase = await createServerClient()
  const year = todayIST().slice(0, 4)
  const [exp, rev] = await Promise.all([
    supabase.from('expenses').select('category, amount').gte('date', `${year}-01-01`).lte('date', `${year}-12-31`).limit(5000),
    // Money can be summed across methods; quantities never are. Revenue counts sold harvests only.
    supabase
      .from('harvest_stats')
      .select('revenue')
      .not('sale_rate', 'is', null)
      .gte('harvest_date', `${year}-01-01`)
      .lte('harvest_date', `${year}-12-31`)
      .limit(5000),
  ])
  const err = exp.error ?? rev.error
  if (err) return <p className="text-destructive">{err.message}</p>
  const byCat = new Map<string, number>()
  let total = 0
  for (const e of exp.data ?? []) {
    const a = Number(e.amount)
    total += a
    byCat.set(e.category, (byCat.get(e.category) ?? 0) + a)
  }
  const revenue = (rev.data ?? []).reduce((s, r) => s + Number(r.revenue ?? 0), 0)
  const profit = revenue - total
  return (
    <Card className="gap-2 p-4">
      <h2 className="font-medium">
        <T>Profit this year</T> ({year})
      </h2>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground"><T>Revenue (sold harvests)</T></span>
        <span>{formatINR(revenue)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground"><T>Total expenses</T></span>
        <span>{formatINR(total)}</span>
      </div>
      <div className="flex justify-between border-t pt-2 font-semibold">
        <span><T>Profit</T></span>
        <span className={profit < 0 ? 'text-destructive' : 'text-primary'}>{formatINR(profit)}</span>
      </div>
      {byCat.size > 0 && (
        <div className="space-y-1 border-t pt-2 text-sm">
          <div className="text-xs text-muted-foreground"><T>By category</T></div>
          {[...byCat].sort((a, b) => b[1] - a[1]).map(([c, v]) => (
            <div key={c} className="flex justify-between">
              <span><T>{cap(c)}</T></span>
              <span>{formatINR(v)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

async function Recent() {
  const supabase = await createServerClient()
  const [{ data: rows, error }, { data: farms }] = await Promise.all([
    supabase.from('expenses').select('id, farm_id, date, category, amount, notes').order('date', { ascending: false }).limit(50),
    supabase.from('farms').select('id, name'),
  ])
  if (error) return <p className="text-destructive">{error.message}</p>
  if (!rows?.length) return <p className="text-muted-foreground"><T>No expenses recorded.</T></p>
  const farmName = new Map((farms ?? []).map((f) => [f.id, f.name]))
  return (
    <section className="space-y-2">
      <h2 className="font-medium"><T>Recent expenses</T></h2>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id}>
            <Card className="p-4">
              <div className="flex items-baseline justify-between">
                <span className="font-medium"><T>{cap(r.category)}</T></span>
                <span className="font-semibold">{formatINR(Number(r.amount))}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {farmName.get(r.farm_id) ?? 'Farm'} · {r.date}
              </div>
              {r.notes ? <div className="text-sm">{r.notes}</div> : null}
              <ConfirmDeleteButton id={r.id} action={deleteExpense} />
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function Page() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">
        🧾 <T>Expenses</T>
      </h1>
      <Suspense fallback={<Loading />}>
        <Summary />
      </Suspense>
      <Suspense fallback={<Loading />}>
        <FormLoader />
      </Suspense>
      <Suspense fallback={<Loading />}>
        <Recent />
      </Suspense>
    </div>
  )
}
