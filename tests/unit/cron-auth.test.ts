import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const ingest = vi.hoisted(() => vi.fn(async () => ({ farms: 1, rows: 7, errors: [] as string[] })))
vi.mock('@/lib/weather/ingest', () => ({ ingestRecentWeather: ingest }))

import { GET } from '@/app/api/cron/weather/route'

const req = (auth?: string) =>
  new Request('http://localhost/api/cron/weather', { headers: auth ? { authorization: auth } : {} })

describe('cron weather auth', () => {
  beforeEach(() => {
    ingest.mockClear()
    vi.stubEnv('CRON_SECRET', 's3cret')
  })
  afterEach(() => vi.unstubAllEnvs())

  it('401 without bearer', async () => {
    expect((await GET(req())).status).toBe(401)
    expect(ingest).not.toHaveBeenCalled()
  })
  it('401 with wrong bearer', async () => {
    expect((await GET(req('Bearer nope'))).status).toBe(401)
    expect(ingest).not.toHaveBeenCalled()
  })
  it('401 when CRON_SECRET unset, even for empty or undefined bearer', async () => {
    vi.stubEnv('CRON_SECRET', '')
    expect((await GET(req('Bearer undefined'))).status).toBe(401)
    expect((await GET(req('Bearer '))).status).toBe(401)
    expect(ingest).not.toHaveBeenCalled()
  })
  it('runs ingest with the right bearer', async () => {
    const res = await GET(req('Bearer s3cret'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ farms: 1, rows: 7, errors: [] })
  })
})
