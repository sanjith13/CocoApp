import { createTestDb, type TestDb } from './harness'

let t: TestDb
beforeEach(async () => {
  t = await createTestDb()
})
afterEach(async () => {
  await t.close()
})

test('auth.uid() returns the impersonated user', async () => {
  const u = await t.createUser()
  const r = await t.asUser(u, (tx) => tx.query<{ uid: string }>('select auth.uid() as uid'))
  expect(r.rows[0].uid).toBe(u)
})

test('asUser runs as authenticated, asService does not', async () => {
  const u = await t.createUser()
  const asUser = await t.asUser(u, (tx) => tx.query<{ r: string }>('select current_user as r'))
  expect(asUser.rows[0].r).toBe('authenticated')
  const asService = await t.asService((tx) => tx.query<{ r: string }>('select current_user as r'))
  expect(asService.rows[0].r).not.toBe('authenticated')
})
