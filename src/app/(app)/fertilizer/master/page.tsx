import { Loading } from '@/components/ui/loading'
import { Suspense } from 'react'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { FertilizerForm } from '@/components/fertilizer/FertilizerForm'

async function MasterList() {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('fertilizer_master')
    .select('id, user_id, name, n_pct, p_pct, k_pct')
    .order('name')
  if (error) return <p className="text-destructive">{error.message}</p>
  return (
    <ul className="space-y-2">
      {(data ?? []).map((f) => (
        <li key={f.id}>
          <Card className="flex items-baseline justify-between p-3">
            <span className="font-medium">{f.name}</span>
            <span className="text-sm text-muted-foreground">
              N {Number(f.n_pct)} / P {Number(f.p_pct)} / K {Number(f.k_pct)}
              {f.user_id === null ? ' (built-in)' : ''}
            </span>
          </Card>
        </li>
      ))}
    </ul>
  )
}

export default function Page() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">🌱 Fertilizers</h1>
        <Link href="/fertilizer" className="text-sm underline">
          Applications
        </Link>
      </div>
      <Suspense fallback={<Loading />}>
        <MasterList />
      </Suspense>
      <h2 className="text-lg font-medium">Add your own</h2>
      <FertilizerForm />
    </div>
  )
}
