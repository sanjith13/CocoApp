import { avgBy, monthLabel, monthSpan, sumBy } from '@/lib/domain/dashboard'

test('monthLabel and monthSpan', () => {
  expect(monthLabel('2025-03-01')).toBe('Mar 25')
  expect(monthSpan('2024-04-01', '2025-03-01')).toBe(11)
})

test('sumBy sorts keys and ignores nulls; avgBy averages', () => {
  const rows = [
    { k: 'b', v: 2 },
    { k: 'a', v: 1 },
    { k: 'b', v: null },
    { k: 'b', v: 4 },
  ]
  expect(sumBy(rows, (r) => r.k, (r) => r.v)).toEqual([['a', 1], ['b', 6]])
  expect(avgBy(rows, (r) => r.k, (r) => r.v)).toEqual([['a', 1], ['b', 3]])
})
