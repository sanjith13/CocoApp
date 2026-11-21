import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

async function WeatherTable({ params }: { params: Promise<{ farmId: string }> }) {
  const { farmId } = await params
  const supabase = await createServerClient()
  const [{ data: farm }, { data: days }] = await Promise.all([
    supabase.from('farms').select('id, name').eq('id', farmId).maybeSingle(),
    supabase
      .from('weather_daily')
      .select('date, temp_min, temp_max, humidity_mean, rainfall_mm, weather_type')
      .eq('farm_id', farmId)
      .order('date', { ascending: false })
      .limit(120),
  ])
  if (!farm) notFound()
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Weather - {farm.name}</h1>
        <Link href={`/farms/${farm.id}`} className="text-sm text-muted-foreground underline">
          Back to farm
        </Link>
      </div>
      {(days ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No weather data yet. It is loaded after the farm is saved and refreshed daily.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1">Date</th>
              <th className="py-1">Type</th>
              <th className="py-1 text-right">Min °C</th>
              <th className="py-1 text-right">Max °C</th>
              <th className="py-1 text-right">Humidity %</th>
              <th className="py-1 text-right">Rain mm</th>
            </tr>
          </thead>
          <tbody>
            {(days ?? []).map((d) => (
              <tr key={d.date} className="border-t">
                <td className="py-2">{d.date}</td>
                <td className="py-2">{d.weather_type ?? '-'}</td>
                <td className="py-2 text-right">{d.temp_min ?? '-'}</td>
                <td className="py-2 text-right">{d.temp_max ?? '-'}</td>
                <td className="py-2 text-right">{d.humidity_mean ?? '-'}</td>
                <td className="py-2 text-right">{d.rainfall_mm ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function Page({ params }: { params: Promise<{ farmId: string }> }) {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
      <WeatherTable params={params} />
    </Suspense>
  )
}
