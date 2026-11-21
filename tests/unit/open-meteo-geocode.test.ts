import { describe, it, expect, vi } from 'vitest'
import fixture from '../fixtures/open-meteo-geocode.json'
import { geocode } from '@/lib/weather/openMeteo'

const respond = (body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch

describe('geocode', () => {
  it('returns mapped results and calls the expected URL', async () => {
    const f = respond(fixture)
    const out = await geocode('Kangayam', f)
    expect(out[0]).toEqual({ name: 'Kangayam', admin1: 'Tamil Nadu', latitude: 11.0, longitude: 77.56 })
    const url = String((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0])
    expect(url).toBe('https://geocoding-api.open-meteo.com/v1/search?name=Kangayam&count=5&language=en&format=json')
  })
  it('returns [] when results missing', async () => {
    expect(await geocode('zzz', respond({}))).toEqual([])
  })
  it('throws on HTTP error', async () => {
    const f = vi.fn(async () => new Response('', { status: 500 })) as unknown as typeof fetch
    await expect(geocode('x', f)).rejects.toThrow()
  })
})
