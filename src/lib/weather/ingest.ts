import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { addDays, oneYearBefore, todayIST } from '@/lib/domain/dates'
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

/** Computes and stores 10-year monthly rainfall normals (previous 10 full calendar years). */
async function computeNormals(
  admin: Admin,
  farmId: string,
  lat: number,
  lon: number,
  fetchFn: typeof fetch,
): Promise<void> {
  const year = Number(todayIST().slice(0, 4))
  const history = await fetchDaily(lat, lon, `${year - 10}-01-01`, `${year - 1}-12-31`, { archive: true }, fetchFn)
  const normals = monthlyNormals(history).map((n) => ({ farm_id: farmId, ...n }))
  if (normals.length > 0) {
    const { error } = await admin.from('farm_climate_normals').upsert(normals, { onConflict: 'farm_id,month' })
    if (error) throw new Error(error.message)
  }
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
  const recent = await fetchDaily(lat, lon, oneYearBefore(today), today, { archive: true })
  await upsertDays(admin, farmId, recent)
  await computeNormals(admin, farmId, lat, lon, fetch)
}

/** Pulls the last complete days for every active farm. One farm failing does not stop the rest. */
export async function ingestRecentWeather(
  deps: { admin?: Admin; fetchFn?: typeof fetch; backfill?: (farmId: string) => Promise<void> } = {},
): Promise<{ farms: number; rows: number; errors: string[] }> {
  const admin = deps.admin ?? createAdminClient()
  const fetchFn = deps.fetchFn ?? fetch
  const backfill = deps.backfill ?? backfillFarmWeather
  const { data: farms, error } = await admin
    .from('farms')
    .select('id, latitude, longitude')
    .eq('active', true)
  if (error) throw new Error(error.message)
  // Farms whose normals never loaded (e.g. archive call failed at creation) get them retried here.
  // One row per farm (month 1; all 12 months are written together) keeps this under PostgREST's 1000-row cap.
  const { data: normalRows, error: nErr } = await admin
    .from('farm_climate_normals')
    .select('farm_id')
    .eq('month', 1)
    .in('farm_id', (farms ?? []).map((f) => f.id))
  if (nErr) throw new Error(nErr.message)
  const haveNormals = new Set((normalRows ?? []).map((r) => r.farm_id as string))
  // Farms whose 12-month backfill never landed (failed at creation): they have no daily row in a
  // narrow window around 30 days ago. One bounded query (<= 8 rows per farm), not one per farm.
  const today = todayIST()
  const { data: oldRows, error: oErr } = await admin
    .from('weather_daily')
    .select('farm_id')
    .in('farm_id', (farms ?? []).map((f) => f.id))
    .lte('date', addDays(today, -30))
    .gte('date', addDays(today, -37))
  if (oErr) throw new Error(oErr.message)
  const haveHistory = new Set((oldRows ?? []).map((r) => r.farm_id as string))
  let rows = 0
  const errors: string[] = []
  for (const farm of farms ?? []) {
    try {
      if (farm.latitude == null || farm.longitude == null) continue
      if (!haveHistory.has(farm.id)) {
        // Best effort: a failed backfill must not stop the daily pull below.
        try {
          await backfill(farm.id)
          haveNormals.add(farm.id) // backfill also computes normals
        } catch (e) {
          errors.push(`${farm.id}: backfill ${e instanceof Error ? e.message : String(e)}`)
        }
      }
      const days = await fetchDaily(Number(farm.latitude), Number(farm.longitude), '', '', { archive: false }, fetchFn)
      rows += await upsertDays(admin, farm.id, days)
      if (!haveNormals.has(farm.id)) {
        await computeNormals(admin, farm.id, Number(farm.latitude), Number(farm.longitude), fetchFn)
      }
    } catch (e) {
      errors.push(`${farm.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return { farms: farms?.length ?? 0, rows, errors }
}
