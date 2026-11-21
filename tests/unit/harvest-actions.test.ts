import { describe, it, expect, vi, beforeEach } from 'vitest'

const gen = vi.hoisted(() => vi.fn())
const redirectMock = vi.hoisted(() =>
  vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
)
const state = vi.hoisted(() => ({ before: null as { farm_id: string; harvest_date: string } | null }))

vi.mock('next/navigation', () => ({ redirect: redirectMock }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/reports/generate', () => ({ generateReportsAround: gen }))
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({
    from(table: string) {
      const q: Record<string, unknown> = {}
      Object.assign(q, {
        select: () => q,
        eq: () => q,
        update: () => q,
        delete: () => q,
        insert: () => q,
        maybeSingle: async () => ({ data: table === 'harvests' ? state.before : null, error: null }),
        then: (f: (v: unknown) => unknown) => f({ data: null, error: null }),
      })
      return q
    },
  }),
}))

import { saveHarvest } from '@/app/(app)/harvests/actions'

const HID = '11111111-1111-4111-8111-111111111111'
function form(over: Record<string, string>) {
  const f = new FormData()
  const base = { id: HID, farm_id: 'farm-new', harvest_date: '2026-02-10', method: 'mudi', mudi_count: '10', ...over }
  for (const [k, v] of Object.entries(base)) f.set(k, v)
  return f
}
const run = async (over: Record<string, string>) => {
  try {
    await saveHarvest(null, form(over))
  } catch (e) {
    return (e as Error).message
  }
}

beforeEach(() => {
  gen.mockReset()
  gen.mockResolvedValue(undefined)
  redirectMock.mockClear()
})

describe('saveHarvest report regeneration', () => {
  it('regenerates the old farm around the old date when the farm changes', async () => {
    state.before = { farm_id: 'farm-old', harvest_date: '2026-01-05' }
    await run({})
    expect(gen).toHaveBeenCalledTimes(2)
    expect(gen).toHaveBeenNthCalledWith(1, expect.anything(), { harvestId: HID, extraAfterDates: [] })
    expect(gen).toHaveBeenNthCalledWith(2, expect.anything(), { farmId: 'farm-old', extraAfterDates: ['2026-01-05'] })
  })

  it('same farm, moved date: one call with the old date', async () => {
    state.before = { farm_id: 'farm-new', harvest_date: '2026-01-05' }
    await run({})
    expect(gen).toHaveBeenCalledTimes(1)
    expect(gen).toHaveBeenCalledWith(expect.anything(), { harvestId: HID, extraAfterDates: ['2026-01-05'] })
  })

  it('redirects to the harvest with a retry notice when generation fails', async () => {
    state.before = { farm_id: 'farm-new', harvest_date: '2026-02-10' }
    gen.mockRejectedValue(new Error('boom'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const msg = await run({})
    expect(msg).toContain(`REDIRECT:/harvests/${HID}?notice=`)
    expect(decodeURIComponent(msg!)).toContain('the report could not be generated')
  })
})
