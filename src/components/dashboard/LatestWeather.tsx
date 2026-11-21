import { Card } from '@/components/ui/card'

export type DayRow = {
  date: string
  temp_min: number | string | null
  temp_max: number | string | null
  humidity_mean: number | string | null
  rainfall_mm: number | string | null
  weather_type: string | null
}

const EMOJI: Record<string, string> = { Sunny: '☀️', Cloudy: '☁️', Rainy: '🌧️', Storm: '⛈️' }
const n = (v: number | string | null, dp: number) => (v === null || v === undefined ? '—' : Number(v).toFixed(dp))
const fmt = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', day: '2-digit', month: 'short' }).format(new Date(`${iso}T00:00:00Z`))

/** Most recent day of weather for a farm. The daily job loads yesterday, so this is the latest available day. */
export function LatestWeather({ name, row }: { name?: string; row: DayRow }) {
  return (
    <Card className="gap-1 p-4">
      <div className="flex items-baseline justify-between">
        <span className="font-medium">
          <span aria-hidden className="mr-1">
            {EMOJI[row.weather_type ?? ''] ?? '🌡️'}
          </span>
          {name ? `${name} · ` : ''}
          {row.weather_type ?? 'Latest weather'}
        </span>
        <span className="text-xs text-muted-foreground">Latest: {fmt(row.date)}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Temperature</div>
          {n(row.temp_min, 0)}–{n(row.temp_max, 0)} °C
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Rainfall</div>
          {n(row.rainfall_mm, 1)} mm
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Humidity</div>
          {n(row.humidity_mean, 0)}%
        </div>
      </div>
    </Card>
  )
}
