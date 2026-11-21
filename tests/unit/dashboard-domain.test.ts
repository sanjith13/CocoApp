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

import { monthsAgoFirst, seasonalReady, yearsAgo } from '@/lib/domain/dashboard'

test('seasonalReady needs 365 days and 6 calendar months', () => {
  // Jan and Dec only
  expect(seasonalReady([{ first_date: '2024-01-10', last_date: '2024-12-20', cal_months: 2 }])).toBe(false)
  // 8 harvests over 13 months across 8 calendar months
  expect(seasonalReady([{ first_date: '2024-01-10', last_date: '2025-02-20', cal_months: 8 }])).toBe(true)
  // many months but under a year
  expect(seasonalReady([{ first_date: '2024-01-10', last_date: '2024-12-01', cal_months: 8 }])).toBe(false)
  expect(seasonalReady([])).toBe(false)
})

test('window date helpers', () => {
  expect(monthsAgoFirst('2026-02-15', 36)).toBe('2023-02-01')
  expect(monthsAgoFirst('2026-01-15', 1)).toBe('2025-12-01')
  expect(yearsAgo('2024-02-29', 3)).toBe('2021-02-28')
})
