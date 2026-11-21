import { Loading } from '@/components/ui/loading'
import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { dayLabel, num } from '@/lib/domain/dashboard'
import { LineTrend } from '@/components/charts/LineTrend'
import { BarSeries } from '@/components/charts/BarSeries'

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
  const trend = [...(days ?? [])].reverse().map((d) => ({
    x: dayLabel(d.date),
    tmin: num(d.temp_min),
    tmax: num(d.temp_max),
    rain: num(d.rainfall_mm),
    hum: num(d.humidity_mean),
  }))
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">🌦️ Weather - {farm.name}</h1>
        <Link href={`/farms/${farm.id}`} className="text-sm text-muted-foreground underline">
          Back to farm
        </Link>
      </div>
      {(days ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No weather data yet. It is loaded after the farm is saved and refreshed daily.
        </p>
      ) : (
        <>
          <section className="space-y-1">
            <h2 className="font-medium">Temperature</h2>
            <LineTrend
              data={trend}
              xKey="x"
              series={[
                { key: 'tmax', label: 'Max', unit: '°C' },
                { key: 'tmin', label: 'Min', unit: '°C' },
              ]}
            />
          </section>
          <section className="space-y-1">
            <h2 className="font-medium">Rainfall</h2>
            <BarSeries data={trend} xKey="x" series={[{ key: 'rain', label: 'Rainfall', unit: 'mm' }]} />
          </section>
          <section className="space-y-1">
            <h2 className="font-medium">Humidity</h2>
            <LineTrend data={trend} xKey="x" series={[{ key: 'hum', label: 'Humidity', unit: '%' }]} />
          </section>
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
        </>
      )}
    </div>
  )
}

export default function Page({ params }: { params: Promise<{ farmId: string }> }) {
  return (
    <Suspense fallback={<Loading />}>
      <WeatherTable params={params} />
    </Suspense>
  )
}
