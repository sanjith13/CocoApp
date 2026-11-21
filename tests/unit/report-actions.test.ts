import { describe, it, expect, vi, beforeEach } from 'vitest'

const gen = vi.hoisted(() => vi.fn())
const from = vi.hoisted(() => vi.fn())
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/reports/generate', () => ({ generateReportsAround: gen }))
vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => ({ from }) }))

import { regenerateReport } from '@/app/(app)/reports/actions'
import { deleteMarketRate } from '@/app/(app)/market/actions'
import { deleteApplication } from '@/app/(app)/fertilizer/actions'
import { deletePestIncident } from '@/app/(app)/pests/actions'

const ID = '22222222-2222-4222-8222-222222222222'

beforeEach(() => {
  gen.mockReset()
  from.mockReset()
})

describe('regenerateReport', () => {
  it('rejects a non-uuid without touching the database', async () => {
    const r = await regenerateReport('nope')
    expect(r).toEqual({ ok: false, error: 'Invalid harvest' })
    expect(gen).not.toHaveBeenCalled()
  })
  it('generates for a valid id', async () => {
    gen.mockResolvedValue(undefined)
    expect(await regenerateReport(ID)).toEqual({ ok: true })
    expect(gen).toHaveBeenCalledWith(expect.anything(), { harvestId: ID })
  })
  it('surfaces generation errors', async () => {
    gen.mockRejectedValue(new Error('Harvest not found'))
    expect(await regenerateReport(ID)).toEqual({ ok: false, error: 'Harvest not found' })
  })
})

describe.each([
  ['deleteMarketRate', deleteMarketRate, 'market_rates'],
  ['deleteApplication', deleteApplication, 'fertilizer_applications'],
  ['deletePestIncident', deletePestIncident, 'pest_incidents'],
])('%s', (_name, action, table) => {
  it('rejects a non-uuid id', async () => {
    const r = await action('1; drop table x')
    expect(r.ok).toBe(false)
    expect(from).not.toHaveBeenCalled()
  })
  it('deletes the row by id on the right table', async () => {
    const eq = vi.fn(async () => ({ error: null }))
    from.mockReturnValue({ delete: () => ({ eq }) })
    expect(await action(ID)).toEqual({ ok: true })
    expect(from).toHaveBeenCalledWith(table)
    expect(eq).toHaveBeenCalledWith('id', ID)
  })
  it('returns the database error', async () => {
    from.mockReturnValue({ delete: () => ({ eq: async () => ({ error: { message: 'denied' } }) }) })
    expect(await action(ID)).toEqual({ ok: false, error: 'denied' })
  })
})
