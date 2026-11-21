import { describe, it, expect } from 'vitest'
import { todayIST } from '@/lib/domain/dates'
import { nutsFromMudi, previewRevenue } from '@/lib/domain/harvest'
import { formatINR, formatPct } from '@/lib/domain/format'
import { isPublicPath } from '@/lib/supabase/middleware'

describe('domain helpers', () => {
  it('todayIST rolls over at IST midnight', () => {
    expect(todayIST(new Date('2026-11-20T20:00:00Z'))).toBe('2026-11-21')
    expect(todayIST(new Date('2026-11-21T10:00:00Z'))).toBe('2026-11-21')
  })
  it('nutsFromMudi', () => {
    expect(nutsFromMudi(120, 15)).toBe(24015)
    expect(nutsFromMudi(1)).toBe(200)
  })
  it('previewRevenue', () => {
    expect(previewRevenue('ton', 2.5, 0, 28000)).toBe(70000)
    expect(previewRevenue('mudi', 1, 0, null)).toBeNull()
    expect(previewRevenue('mudi', 1, 5, 10)).toBe(2050)
  })
  it('formatters', () => {
    expect(formatPct(null)).toBe('—')
    expect(formatPct(10)).toBe('▲ 10.0%')
    expect(formatPct(-10)).toBe('▼ 10.0%')
    expect(formatINR(null)).toBe('—')
    expect(formatINR(70000)).toBe('₹70,000')
  })
  it('isPublicPath', () => {
    expect(isPublicPath('/login')).toBe(true)
    expect(isPublicPath('/signup')).toBe(true)
    expect(isPublicPath('/auth/callback')).toBe(true)
    expect(isPublicPath('/api/cron/weather')).toBe(true)
    expect(isPublicPath('/_next/static/x.js')).toBe(true)
    expect(isPublicPath('/dashboard')).toBe(false)
  })
})
