import { describe, it, expect, vi, beforeEach } from 'vitest'

const build = vi.hoisted(() => vi.fn())
vi.mock('@/lib/reports/snapshot', () => ({ buildSnapshot: build }))
vi.mock('@/lib/reports/prompt', () => ({ renderPrompt: () => 'PROMPT' }))

import { generateReportsAround } from '@/lib/reports/generate'

const HARVESTS = [
  { id: 'h1', farm_id: 'f', harvest_date: '2025-01-15' },
  { id: 'h2', farm_id: 'f', harvest_date: '2025-03-15' },
  { id: 'h3', farm_id: 'f', harvest_date: '2025-05-15' },
]

function stub() {
  const upserts: { harvest_id: string }[] = []
  const client = {
    from(table: string) {
      if (table === 'reports') {
        return {
          upsert: (row: { harvest_id: string }) => {
            upserts.push(row)
            return Promise.resolve({ error: null })
          },
        }
      }
      let after: string | null = null
      let byId: string | null = null
      const q = {
        select: () => q,
        eq: (col: string, v: string) => {
          if (col === 'id') byId = v
          return q
        },
        gt: (_c: string, v: string) => {
          after = v
          return q
        },
        order: () => q,
        limit: () => q,
        maybeSingle: () =>
          Promise.resolve({
            data: byId
              ? (HARVESTS.find((h) => h.id === byId) ?? null)
              : (HARVESTS.find((h) => after && h.harvest_date > after) ?? null),
            error: null,
          }),
      }
      return q
    },
  }
  return { client: client as never, upserts }
}

beforeEach(() => {
  build.mockReset()
  build.mockImplementation(async (_c: unknown, id: string) => {
    const h = HARVESTS.find((x) => x.id === id)!
    return {
      farmId: h.farm_id,
      harvestId: id,
      harvest: { date: h.harvest_date },
      period: { start: '2025-01-01', end: h.harvest_date },
    }
  })
})

describe('generateReportsAround', () => {
  it('regenerates the harvest and the next harvest after its date', async () => {
    const { client, upserts } = stub()
    await generateReportsAround(client, { harvestId: 'h1' })
    expect(upserts.map((u) => u.harvest_id)).toEqual(['h1', 'h2'])
  })

  it('also regenerates the next harvest after the old date when the date changed', async () => {
    const { client, upserts } = stub()
    await generateReportsAround(client, { harvestId: 'h1', farmId: 'f', extraAfterDates: ['2025-04-01'] })
    expect(upserts.map((u) => u.harvest_id)).toEqual(['h1', 'h2', 'h3'])
  })

  it('on delete regenerates only the next harvest', async () => {
    const { client, upserts } = stub()
    await generateReportsAround(client, { farmId: 'f', extraAfterDates: ['2025-02-15'] })
    expect(upserts.map((u) => u.harvest_id)).toEqual(['h2'])
  })

  it('does not duplicate when both lookups find the same harvest', async () => {
    const { client, upserts } = stub()
    await generateReportsAround(client, { harvestId: 'h1', farmId: 'f', extraAfterDates: ['2025-01-20'] })
    expect(upserts.map((u) => u.harvest_id)).toEqual(['h1', 'h2'])
  })
})
