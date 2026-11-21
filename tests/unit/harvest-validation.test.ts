import { describe, it, expect } from 'vitest'
import { mergeMarketNames } from '@/lib/validation/market'
import { harvestSchema, buildHarvestWrites } from '@/lib/validation/harvest'

const base = { farm_id: 'f1', harvest_date: '2026-11-20' }
const parse = (o: Record<string, unknown>) => harvestSchema.safeParse({ ...base, ...o })

describe('harvestSchema', () => {
  it('rejects mudi input carrying weight_ton', () => {
    expect(parse({ method: 'mudi', mudi_count: 10, weight_ton: 1 }).success).toBe(false)
  })
  it('rejects ton input carrying mudi_count', () => {
    expect(parse({ method: 'ton', weight_ton: 1, mudi_count: 3 }).success).toBe(false)
  })
  it('rejects extra_nuts 200, accepts 199', () => {
    expect(parse({ method: 'mudi', mudi_count: 10, extra_nuts: 200 }).success).toBe(false)
    expect(parse({ method: 'mudi', mudi_count: 10, extra_nuts: 199 }).success).toBe(true)
  })
  it('enforces 0.5 steps and positive mudi', () => {
    expect(parse({ method: 'mudi', mudi_count: 10.5 }).success).toBe(true)
    expect(parse({ method: 'mudi', mudi_count: 10.3 }).success).toBe(false)
    expect(parse({ method: 'mudi', mudi_count: 0 }).success).toBe(false)
  })
  it('rejects blank quantity and 4-decimal tons', () => {
    expect(parse({ method: 'mudi', mudi_count: '' }).success).toBe(false)
    expect(parse({ method: 'ton', weight_ton: 1.2345 }).success).toBe(false)
    expect(parse({ method: 'ton', weight_ton: '1.234' }).success).toBe(true)
  })
  it('requires market_name when saving a rate', () => {
    expect(parse({ method: 'mudi', mudi_count: 5, sale_rate: 12, save_as_market_rate: 'on' }).success).toBe(false)
    expect(
      parse({ method: 'mudi', mudi_count: 5, sale_rate: 12, save_as_market_rate: 'on', market_name: 'Pollachi' }).success,
    ).toBe(true)
  })
  it('blank sale_rate is allowed, zero is not', () => {
    expect(parse({ method: 'mudi', mudi_count: 5, sale_rate: '' }).success).toBe(true)
    expect(parse({ method: 'mudi', mudi_count: 5, sale_rate: 0 }).success).toBe(false)
  })
})

describe('buildHarvestWrites', () => {
  const build = (o: Record<string, unknown>) => buildHarvestWrites(harvestSchema.parse({ ...base, ...o }))
  it('mudi with rate and save flag gives whole-nut market rate', () => {
    const { harvest, marketRate } = build({
      method: 'mudi',
      mudi_count: 10,
      sale_rate: 12,
      save_as_market_rate: true,
      market_name: 'Pollachi',
    })
    expect(marketRate).toEqual({
      market_name: 'Pollachi',
      date: '2026-11-20',
      rate_type: 'whole_nut_per_nut',
      rate: 12,
      source: 'harvest_form',
    })
    expect(harvest).toMatchObject({ method: 'mudi', mudi_count: 10, extra_nuts: 0, weight_ton: null, sale_rate: 12 })
  })
  it('no rate gives no market rate', () => {
    expect(build({ method: 'mudi', mudi_count: 10, save_as_market_rate: true, market_name: 'X' }).marketRate).toBeNull()
  })
  it('ton gives dehusked_per_ton and nulls mudi fields', () => {
    const { harvest, marketRate } = build({
      method: 'ton',
      weight_ton: 2.5,
      sale_rate: 20000,
      save_as_market_rate: true,
      market_name: 'X',
    })
    expect(marketRate?.rate_type).toBe('dehusked_per_ton')
    expect(harvest).toMatchObject({ mudi_count: null, extra_nuts: 0, weight_ton: 2.5 })
  })
})

describe('mergeMarketNames', () => {
  it('lists default markets first and dedupes recent names case-insensitively', () => {
    expect(mergeMarketNames([])).toEqual(['Kangayam', 'Pollachi', 'Udumalpet'])
    expect(mergeMarketNames(['pollachi', 'Erode', 'Erode', ' '])).toEqual(['Kangayam', 'Pollachi', 'Udumalpet', 'Erode'])
  })
})
