import { Loading } from '@/components/ui/loading'
import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'

async function FarmPicker() {
  const supabase = await createServerClient()
  const { data: farms, error } = await supabase.from('farms').select('id, name, location_text').order('name')
  if (error) return <p className="text-destructive">{error.message}</p>
  if (!farms?.length) {
    return (
      <p className="text-muted-foreground">
        No farms yet. <Link href="/farms/new" className="underline">Add a farm</Link> to see its weather.
      </p>
    )
  }
  if (farms.length === 1) redirect(`/weather/${farms[0].id}`)
  return (
    <ul className="space-y-2">
      {farms.map((f) => (
        <li key={f.id}>
          <Link href={`/weather/${f.id}`}>
            <Card className="p-4">
              <div className="font-medium">{f.name}</div>
              {f.location_text && <div className="text-sm text-muted-foreground">{f.location_text}</div>}
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
      <h1 className="text-xl font-semibold">🌦️ Weather</h1>
      <Suspense fallback={<Loading />}>
        <FarmPicker />
      </Suspense>
    </div>
  )
}
