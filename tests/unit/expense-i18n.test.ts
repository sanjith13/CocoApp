import { expenseSchema } from '@/lib/validation/expense'
import { dictionaries, translate } from '@/lib/i18n/dict'

describe('expenseSchema', () => {
  const base = { farm_id: 'f', date: '2026-03-01', category: 'labour', notes: '' }
  it('requires a positive amount; blank is Required', () => {
    expect(expenseSchema.safeParse({ ...base, amount: '' }).success).toBe(false)
    expect(expenseSchema.safeParse({ ...base, amount: '0' }).success).toBe(false)
    expect(expenseSchema.safeParse({ ...base, amount: '-5' }).success).toBe(false)
    const ok = expenseSchema.safeParse({ ...base, amount: '1500.50' })
    expect(ok.success && ok.data.amount).toBe(1500.5)
    expect(ok.success && ok.data.notes).toBeNull()
  })
  it('accepts custom categories, lowercased, and rejects blank or very long ones', () => {
    const ok = expenseSchema.safeParse({ ...base, category: '  Tender Coconut Picking ', amount: '10' })
    expect(ok.success && ok.data.category).toBe('tender coconut picking')
    expect(expenseSchema.safeParse({ ...base, category: '   ', amount: '10' }).success).toBe(false)
    expect(expenseSchema.safeParse({ ...base, category: 'x'.repeat(41), amount: '10' }).success).toBe(false)
  })
})

describe('translate', () => {
  it('returns Tamil for known text and falls back to English otherwise', () => {
    expect(translate('ta', 'Dashboard')).toBe('டாஷ்போர்டு')
    expect(translate('ta', 'Something untranslated')).toBe('Something untranslated')
    expect(translate('en', 'Dashboard')).toBe('Dashboard')
  })
  it('has no empty Tamil values', () => {
    for (const [k, v] of Object.entries(dictionaries.ta)) expect(v.trim(), k).not.toBe('')
  })
})
