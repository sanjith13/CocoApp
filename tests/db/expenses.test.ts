import { createTestDb, type TestDb } from './harness'

let t: TestDb
beforeEach(async () => {
  t = await createTestDb()
})
afterEach(async () => {
  await t.close()
})

async function farmFor(u: string) {
  const r = await t.asUser(u, (tx) =>
    tx.query<{ id: string }>(`insert into farms(name, latitude, longitude, acreage) values ('F', 10.5, 76.2, 2) returning id`),
  )
  return r.rows[0].id
}

test('expenses are private to the farm owner and validated', async () => {
  const u = await t.createUser()
  const other = await t.createUser()
  const farm = await farmFor(u)
  await t.asUser(u, (tx) =>
    tx.query(`insert into expenses(farm_id, date, category, amount) values ($1, '2026-03-01', 'labour', 1500)`, [farm]),
  )
  expect((await t.asUser(u, (tx) => tx.query('select 1 from expenses'))).rows).toHaveLength(1)
  expect((await t.asUser(other, (tx) => tx.query('select 1 from expenses'))).rows).toHaveLength(0)
  await expect(
    t.asUser(other, (tx) =>
      tx.query(`insert into expenses(farm_id, date, category, amount) values ($1, '2026-03-01', 'labour', 10)`, [farm]),
    ),
  ).rejects.toThrow()
  await expect(
    t.asUser(u, (tx) => tx.query(`insert into expenses(farm_id, date, category, amount) values ($1, '2026-03-01', 'lunch', 10)`, [farm])),
  ).rejects.toThrow()
  await expect(
    t.asUser(u, (tx) => tx.query(`insert into expenses(farm_id, date, category, amount) values ($1, '2026-03-01', 'labour', 0)`, [farm])),
  ).rejects.toThrow()
})

test('deleting a farm deletes its expenses', async () => {
  const u = await t.createUser()
  const farm = await farmFor(u)
  await t.asUser(u, (tx) =>
    tx.query(`insert into expenses(farm_id, date, category, amount) values ($1, '2026-03-01', 'other', 5)`, [farm]),
  )
  await t.asUser(u, (tx) => tx.query('delete from farms where id = $1', [farm]))
  expect((await t.asService((tx) => tx.query('select 1 from expenses'))).rows).toHaveLength(0)
})
