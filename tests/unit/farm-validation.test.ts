import { describe, it, expect } from 'vitest'
import { farmSchema, varietySchema, treeCountChangeSchema } from '@/lib/validation/farm'

const base = { name: 'Farm', latitude: 11, longitude: 77, acreage: 2, tree_count: 100 }

describe('farmSchema', () => {
  it('rejects latitude 91', () => {
    expect(farmSchema.safeParse({ ...base, latitude: 91 }).success).toBe(false)
  })
  it('accepts acreage 0', () => {
    expect(farmSchema.safeParse({ ...base, acreage: 0 }).success).toBe(true)
  })
  it('rejects negative or fractional tree count', () => {
    expect(farmSchema.safeParse({ ...base, tree_count: -1 }).success).toBe(false)
    expect(farmSchema.safeParse({ ...base, tree_count: 1.5 }).success).toBe(false)
  })
  it('rejects empty and over-long names', () => {
    expect(farmSchema.safeParse({ ...base, name: '' }).success).toBe(false)
    expect(farmSchema.safeParse({ ...base, name: 'x'.repeat(81) }).success).toBe(false)
  })
  it('coerces form strings', () => {
    expect(farmSchema.safeParse({ ...base, latitude: '11.5', tree_count: '40' }).success).toBe(true)
  })
})

describe('blank and optional handling', () => {
  it.each(['latitude', 'longitude', 'acreage', 'tree_count'])('rejects blank %s', (k) => {
    expect(farmSchema.safeParse({ ...base, [k]: '' }).success).toBe(false)
    expect(farmSchema.safeParse({ ...base, [k]: '  ' }).success).toBe(false)
  })
  it('rejects blank variety and tree-count-change counts', () => {
    expect(varietySchema.safeParse({ variety_name: 'Tall', tree_count: '' }).success).toBe(false)
    expect(treeCountChangeSchema.safeParse({ tree_count: '', effective_date: '2026-11-21' }).success).toBe(false)
  })
  it('maps empty optional text to null', () => {
    const r = farmSchema.parse({ ...base, location_text: '', soil_type: ' ' })
    expect(r.location_text).toBeNull()
    expect(r.soil_type).toBeNull()
    expect(farmSchema.parse({ ...base }).soil_type).toBeNull()
  })
})

describe('varietySchema', () => {
  it('requires name and non-negative integer count', () => {
    expect(varietySchema.safeParse({ variety_name: 'Tall', tree_count: 5 }).success).toBe(true)
    expect(varietySchema.safeParse({ variety_name: '', tree_count: 5 }).success).toBe(false)
    expect(varietySchema.safeParse({ variety_name: 'Tall', tree_count: -2 }).success).toBe(false)
  })
})
