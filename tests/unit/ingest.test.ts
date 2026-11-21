import { describe, it, expect, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

import { ingestRecentWeather } from '@/lib/weather/ingest'
import { oneYearBefore } from '@/lib/domain/dates'

describe('oneYearBefore', () => {
  it('clamps 29 Feb to 28 Feb', () => expect(oneYearBefore('2028-02-29')).toBe('2027-02-28'))
  it('keeps a normal date', () => expect(oneYearBefore('2026-11-21')).toBe('2025-11-21'))
})

type Row = Record<string, unknown>
function fakeAdmin(farms: Row[], normalFarmIds: string[], historyFarmIds: string[] = normalFarmIds) {
  const upserts: Array<{ table: string; rows: Row[] }> = []
  const admin = {
    from(table: string) {
      return {
        select: () => {
          const ids = table === 'weather_daily' ? historyFarmIds : normalFarmIds
          const data = table === 'farms' ? farms : ids.map((farm_id) => ({ farm_id }))
          const res = { data, error: null }
          const chain = { eq: () => chain, in: () => chain, lte: () => chain, gte: () => chain, then: (f: (v: typeof res) => unknown) => f(res) }
          return chain
        },
        upsert: async (rows: Row[]) => {
          upserts.push({ table, rows })
          return { error: null }
        },
      }
    },
  }
  return { admin: admin as never, upserts }
}

const body = (time: string[], rain: number) => ({
  daily: {
    time,
    temperature_2m_max: time.map(() => 30),
    temperature_2m_min: time.map(() => 22),
    temperature_2m_mean: time.map(() => 26),
    relative_humidity_2m_mean: time.map(() => 70),
    precipitation_sum: time.map(() => rain),
    wind_speed_10m_max: time.map(() => 10),
    weather_code: time.map(() => 1),
  },
})

describe('ingestRecentWeather', () => {
  it('computes missing normals, skips farms that have them, and survives one farm failing', async () => {
    const farms = [
      { id: 'bad', latitude: 1, longitude: 1 },
      { id: 'new', latitude: 2, longitude: 2 },
      { id: 'old', latitude: 3, longitude: 3 },
    ]
    const { admin, upserts } = fakeAdmin(farms, ['old'], ['bad', 'new', 'old'])
    const fetchFn = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('latitude=1&')) return new Response('', { status: 500 })
      if (url.includes('archive-api')) return new Response(JSON.stringify(body(['2020-06-01', '2021-06-01'], 5)), { status: 200 })
      return new Response(JSON.stringify(body(['2020-01-01'], 1)), { status: 200 })
    }) as unknown as typeof fetch

    const out = await ingestRecentWeather({ admin, fetchFn, backfill: vi.fn(async () => {}) })

    expect(out.farms).toBe(3)
    expect(out.errors).toHaveLength(1)
    expect(out.errors[0]).toContain('bad')
    expect(out.rows).toBe(2)
    const normals = upserts.filter((u) => u.table === 'farm_climate_normals')
    expect(normals).toHaveLength(1)
    expect(normals[0].rows).toEqual([{ farm_id: 'new', month: 6, mean_rainfall_mm: 5 }])
  })

  it('backfills only active farms with no history, and a failing backfill does not stop the daily pull', async () => {
    const farms = [
      { id: 'hist', latitude: 1, longitude: 1 },
      { id: 'empty', latitude: 2, longitude: 2 },
      { id: 'broken', latitude: 3, longitude: 3 },
    ]
    const { admin, upserts } = fakeAdmin(farms, ['hist', 'empty', 'broken'], ['hist'])
    const backfill = vi.fn(async (id: string) => {
      if (id === 'broken') throw new Error('archive down')
    })
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(body(['2020-01-01'], 1)), { status: 200 })) as unknown as typeof fetch

    const out = await ingestRecentWeather({ admin, fetchFn, backfill })

    expect(backfill.mock.calls.map((c) => c[0])).toEqual(['empty', 'broken'])
    expect(out.errors).toHaveLength(1)
    expect(out.errors[0]).toContain('broken')
    expect(upserts.filter((u) => u.table === 'weather_daily')).toHaveLength(3) // daily pull ran for every farm
  })
})
