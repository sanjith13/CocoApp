import { vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }))

import { adminEmails, isAdminEmail } from '@/lib/auth/admin'

describe('admin emails', () => {
  it('parses a comma separated list, trimmed and lowercased', () => {
    expect(adminEmails(' A@x.com, b@y.com ,, ')).toEqual(['a@x.com', 'b@y.com'])
    expect(adminEmails(undefined)).toEqual([])
  })
  it('matches case-insensitively and denies everyone when unset', () => {
    expect(isAdminEmail('A@X.com', 'a@x.com')).toBe(true)
    expect(isAdminEmail('other@x.com', 'a@x.com')).toBe(false)
    expect(isAdminEmail(null, 'a@x.com')).toBe(false)
    expect(isAdminEmail('a@x.com', '')).toBe(false)
  })
})
