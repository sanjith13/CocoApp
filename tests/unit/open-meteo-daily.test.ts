import { describe, it, expect, vi } from 'vitest'
import fixture from '../fixtures/open-meteo-daily.json'
import { fetchDaily, wmoToType } from '@/lib/weather/openMeteo'

const respond = (body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch

describe('fetchDaily', () => {
  it('parses days, drops all-null and future days, adds weather_type', async () => {
    const f = respond(fixture)
    const out = await fetchDaily(11, 77.5, '2025-06-01', '2025-06-03', { archive: true }, f)
    expect(out).toEqual([
      { date: '2025-06-01', temp_max: 33.1, temp_min: 24, temp_mean: 28.2, humidity_mean: 70, rainfall_mm: 0, windspeed_max: 14.2, weather_code: 1, weather_type: 'Sunny' },
      { date: '2025-06-02', temp_max: 29.4, temp_min: 23.5, temp_mean: 26.1, humidity_mean: 85, rainfall_mm: 12.4, windspeed_max: 18, weather_code: 63, weather_type: 'Rainy' },
    ])
  })
  it('uses the archive host with start/end dates', async () => {
    const f = respond(fixture)
    await fetchDaily(11, 77.5, '2025-06-01', '2025-06-03', { archive: true }, f)
    const url = String((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0])
    expect(url.startsWith('https://archive-api.open-meteo.com/v1/archive?')).toBe(true)
    expect(url).toContain('start_date=2025-06-01')
    expect(url).toContain('end_date=2025-06-03')
    expect(url).toContain('timezone=Asia%2FKolkata')
  })
  it('uses the forecast host with past_days for recent data', async () => {
    const f = respond(fixture)
    await fetchDaily(11, 77.5, '2025-06-01', '2025-06-03', { archive: false }, f)
    const url = String((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0])
    expect(url.startsWith('https://api.open-meteo.com/v1/forecast?')).toBe(true)
    expect(url).toContain('past_days=7&forecast_days=1')
    expect(url).not.toContain('start_date')
  })
  it('throws on HTTP error', async () => {
    const f = vi.fn(async () => new Response('', { status: 500 })) as unknown as typeof fetch
    await expect(fetchDaily(1, 2, '2025-01-01', '2025-01-02', { archive: true }, f)).rejects.toThrow()
  })
})

describe('wmoToType', () => {
  it('maps codes', () => {
    expect(wmoToType(63)).toBe('Rainy')
    expect(wmoToType(95)).toBe('Storm')
    expect(wmoToType(0)).toBe('Sunny')
    expect(wmoToType(45)).toBe('Cloudy')
    expect(wmoToType(81)).toBe('Rainy')
    expect(wmoToType(75)).toBe('Cloudy')
  })
})
