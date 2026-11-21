import { Suspense } from 'react'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'

async function FarmList() {
  const supabase = await createServerClient()
  const { data: farms, error } = await supabase
    .from('farms_with_trees')
    .select('id, name, location_text, acreage, current_tree_count')
    .eq('active', true)
    .order('name')
  if (error) return <p className="text-destructive">{error.message}</p>
  if (!farms?.length) return <p className="text-muted-foreground">No farms yet. Add your first farm.</p>
  return (
    <ul className="space-y-3">
      {farms.map((f) => (
        <li key={f.id}>
          <Link href={`/farms/${f.id}`}>
            <Card className="p-4">
              <div className="font-medium">{f.name}</div>
              <div className="text-sm text-muted-foreground">{f.location_text ?? 'No location'}</div>
              <div className="mt-1 text-sm">
                {f.current_tree_count ?? 0} trees · {f.acreage} acres
              </div>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default function Page() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">🌴 Farms</h1>
        <Link href="/farms/new" className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-primary-foreground">
          Add farm
        </Link>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
        <FarmList />
      </Suspense>
    </div>
  )
}
