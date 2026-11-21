import { createTestDb } from './harness'
test('auth.uid() returns the impersonated user', async () => {
  const t = await createTestDb()
  const u = await t.createUser()
  const r = await t.asUser(u, tx => tx.query<{ uid: string }>('select auth.uid() as uid'))
  expect(r.rows[0].uid).toBe(u)
})
