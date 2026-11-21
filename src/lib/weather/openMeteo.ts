import { todayIST } from '@/lib/domain/dates'

export type GeocodeResult = {
  name: string
  admin1?: string
  latitude: number
  longitude: number
}

export async function geocode(query: string, fetchFn: typeof fetch = fetch): Promise<GeocodeResult[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
  const res = await fetchFn(url)
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`)
  const body = (await res.json()) as { results?: Array<Record<string, unknown>> }
  return (body.results ?? []).map((r) => ({
    name: r.name as string,
    admin1: r.admin1 as string | undefined,
    latitude: r.latitude as number,
    longitude: r.longitude as number,
  }))
}

export type WeatherType = 'Sunny' | 'Cloudy' | 'Rainy' | 'Storm'

export type WeatherDay = {
  date: string
  temp_min: number | null
  temp_max: number | null
  temp_mean: number | null
  humidity_mean: number | null
  rainfall_mm: number | null
  windspeed_max: number | null
  weather_code: number | null
  weather_type: WeatherType | null
}

/** Maps a WMO weather code to a coarse type. Unknown codes fall back to Cloudy. */
export function wmoToType(code: number): WeatherType {
  if (code <= 1) return 'Sunny'
  if (code >= 95) return 'Storm'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'Rainy'
  return 'Cloudy'
}

const DAILY_VARS =
  'temperature_2m_max,temperature_2m_min,temperature_2m_mean,relative_humidity_2m_mean,precipitation_sum,wind_speed_10m_max,weather_code'

/** Daily weather for a point. Archive uses start/end; recent uses the forecast endpoint's past_days window. */
export async function fetchDaily(
  lat: number,
  lon: number,
  start: string,
  end: string,
  opts: { archive: boolean },
  fetchFn: typeof fetch = fetch,
): Promise<WeatherDay[]> {
  const base = `latitude=${lat}&longitude=${lon}&daily=${DAILY_VARS}&timezone=Asia%2FKolkata`
  const url = opts.archive
    ? `https://archive-api.open-meteo.com/v1/archive?${base}&start_date=${start}&end_date=${end}`
    : `https://api.open-meteo.com/v1/forecast?${base}&past_days=7&forecast_days=1`
  const res = await fetchFn(url)
  if (!res.ok) throw new Error(`Weather fetch failed (${res.status})`)
  const body = (await res.json()) as { daily?: Record<string, Array<number | string | null>> }
  const d = body.daily
  if (!d?.time) return []
  const today = todayIST()
  const num = (key: string, i: number) => {
    const v = d[key]?.[i]
    return typeof v === 'number' ? v : null
  }
  const days: WeatherDay[] = []
  d.time.forEach((t, i) => {
    const date = String(t)
    if (date >= today) return
    const code = num('weather_code', i)
    const day: WeatherDay = {
      date,
      temp_max: num('temperature_2m_max', i),
      temp_min: num('temperature_2m_min', i),
      temp_mean: num('temperature_2m_mean', i),
      humidity_mean: num('relative_humidity_2m_mean', i),
      rainfall_mm: num('precipitation_sum', i),
      windspeed_max: num('wind_speed_10m_max', i),
      weather_code: code,
      weather_type: code === null ? null : wmoToType(code),
    }
    const { date: _d, weather_type: _w, ...values } = day
    if (Object.values(values).every((v) => v === null)) return
    days.push(day)
  })
  return days
}
