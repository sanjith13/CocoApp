import { applicationIdSchema } from '@/lib/validation/fertilizer-effect'
import { applicationSchema, fertilizerSchema } from '@/lib/validation/fertilizer'

test('application id must be a uuid', () => {
  expect(applicationIdSchema.safeParse('nope').success).toBe(false)
  expect(applicationIdSchema.safeParse('123e4567-e89b-12d3-a456-426614174000').success).toBe(true)
})

test('application requires positive kg; blank is Required', () => {
  const base = { farm_id: 'f', date: '2026-03-01', fertilizer_id: 'x' }
  expect(applicationSchema.safeParse({ ...base, quantity_kg: '' }).success).toBe(false)
  expect(applicationSchema.safeParse({ ...base, quantity_kg: '0' }).success).toBe(false)
  expect(applicationSchema.safeParse({ ...base, quantity_kg: '50' }).success).toBe(true)
})

test('fertilizer pct bounded 0-100', () => {
  expect(fertilizerSchema.safeParse({ name: 'A', n_pct: '101' }).success).toBe(false)
  expect(fertilizerSchema.safeParse({ name: 'A', n_pct: '10' }).success).toBe(true)
})
