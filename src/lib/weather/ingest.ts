import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayIST } from '@/lib/domain/dates'
import { fetchDaily, type WeatherDay } from './openMeteo'

type Admin = ReturnType<typeof createAdminClient>

async function upsertDays(admin: Admin, farmId: string, days: WeatherDay[]): Promise<number> {
  // Chunked to keep request bodies small for the 12-month backfill.
  for (let i = 0; i < days.length; i += 200) {
    const chunk = days.slice(i, i + 200).map((d) => ({ farm_id: farmId, ...d }))
    const { error } = await admin.from('weather_daily').upsert(chunk, { onConflict: 'farm_id,date' })
    if (error) throw new Error(error.message)
  }
  return days.length
}

/** Mean of monthly rainfall sums per calendar month over the given daily rows. */
export function monthlyNormals(days: WeatherDay[]): Array<{ month: number; mean_rainfall_mm: number }> {
  const sums = new Map<string, number>() // "YYYY-MM" -> total
  for (const d of days) {
    const key = d.date.slice(0, 7)
    sums.set(key, (sums.get(key) ?? 0) + (d.rainfall_mm ?? 0))
  }
  const byMonth = new Map<number, number[]>()
  for (const [key, total] of sums) {
    const m = Number(key.slice(5, 7))
    byMonth.set(m, [...(byMonth.get(m) ?? []), total])
  }
  return [...byMonth].map(([month, totals]) => ({
    month,
    mean_rainfall_mm: Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 100) / 100,
  }))
}

/** Loads the last 12 months of daily weather and 10-year monthly rainfall normals for a farm. */
export async function backfillFarmWeather(farmId: string): Promise<void> {
  const admin = createAdminClient()
  const { data: farm, error } = await admin
    .from('farms')
    .select('latitude, longitude')
    .eq('id', farmId)
    .single()
  if (error || !farm) throw new Error(error?.message ?? 'Farm not found')
  if (farm.latitude == null || farm.longitude == null) return
  const lat = Number(farm.latitude)
  const lon = Number(farm.longitude)

  const today = todayIST()
  const year = Number(today.slice(0, 4))
  const yearAgo = `${year - 1}${today.slice(4)}`

  const recent = await fetchDaily(lat, lon, yearAgo, today, { archive: true })
  await upsertDays(admin, farmId, recent)

  // Previous 10 full calendar years, e.g. 2016-01-01..2025-12-31 when run in 2026.
  const history = await fetchDaily(lat, lon, `${year - 10}-01-01`, `${year - 1}-12-31`, { archive: true })
  const normals = monthlyNormals(history).map((n) => ({ farm_id: farmId, ...n }))
  if (normals.length > 0) {
    const { error: nErr } = await admin
      .from('farm_climate_normals')
      .upsert(normals, { onConflict: 'farm_id,month' })
    if (nErr) throw new Error(nErr.message)
  }
}

/** Pulls the last complete days for every active farm. One farm failing does not stop the rest. */
export async function ingestRecentWeather(): Promise<{ farms: number; rows: number; errors: string[] }> {
  const admin = createAdminClient()
  const { data: farms, error } = await admin
    .from('farms')
    .select('id, latitude, longitude')
    .eq('active', true)
  if (error) throw new Error(error.message)
  let rows = 0
  const errors: string[] = []
  for (const farm of farms ?? []) {
    try {
      if (farm.latitude == null || farm.longitude == null) continue
      const days = await fetchDaily(Number(farm.latitude), Number(farm.longitude), '', '', { archive: false })
      rows += await upsertDays(admin, farm.id, days)
    } catch (e) {
      errors.push(`${farm.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return { farms: farms?.length ?? 0, rows, errors }
}
