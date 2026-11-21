import { createTestDb, type TestDb } from './harness'

let t: TestDb
beforeEach(async () => {
  t = await createTestDb()
})
afterEach(async () => {
  await t.close()
})

async function insertFarm(userId: string): Promise<string> {
  const r = await t.asUser(userId, (tx) =>
    tx.query<{ id: string }>(
      `insert into farms(name, latitude, longitude, acreage) values ('A farm', 10.5, 76.2, 5) returning id`,
    ),
  )
  return r.rows[0].id
}

async function seedCounts(farm: string) {
  await t.asService((tx) =>
    tx.query(
      `insert into farm_tree_counts(farm_id, effective_date, tree_count)
       values ($1, '2026-01-01', 400), ($1, '2026-06-01', 380)`,
      [farm],
    ),
  )
}

async function treesOn(farm: string, date: string): Promise<number | null> {
  const r = await t.asService((tx) =>
    tx.query<{ n: number | null }>('select tree_count_on($1, $2::date) as n', [farm, date]),
  )
  return r.rows[0].n
}

test("user B cannot see or update user A's farm", async () => {
  const a = await t.createUser()
  const b = await t.createUser()
  const farm = await insertFarm(a)
  const seen = await t.asUser(b, (tx) => tx.query('select * from farms where id = $1', [farm]))
  expect(seen.rows).toHaveLength(0)
  const upd = await t.asUser(b, (tx) =>
    tx.query(`update farms set name = 'x' where id = $1`, [farm]),
  )
  expect(upd.affectedRows).toBe(0)
  const own = await t.asUser(a, (tx) => tx.query('select name from farms where id = $1', [farm]))
  expect(own.rows).toHaveLength(1)
})

test("user B cannot insert tree counts for A's farm", async () => {
  const a = await t.createUser()
  const b = await t.createUser()
  const farm = await insertFarm(a)
  await expect(
    t.asUser(b, (tx) =>
      tx.query(
        `insert into farm_tree_counts(farm_id, effective_date, tree_count) values ($1, '2026-01-01', 10)`,
        [farm],
      ),
    ),
  ).rejects.toThrow()
})

test('tree_count_on uses count in force on date', async () => {
  const farm = await insertFarm(await t.createUser())
  await seedCounts(farm)
  expect(await treesOn(farm, '2026-03-15')).toBe(400)
  expect(await treesOn(farm, '2026-06-01')).toBe(380)
})

test('tree_count_on falls back to earliest row for backdated date', async () => {
  const farm = await insertFarm(await t.createUser())
  await seedCounts(farm)
  expect(await treesOn(farm, '2025-12-01')).toBe(400)
})

test('tree_count_on is null for a farm with no rows', async () => {
  const farm = await insertFarm(await t.createUser())
  expect(await treesOn(farm, '2026-01-01')).toBeNull()
})

test('farms_with_trees shows latest count', async () => {
  const a = await t.createUser()
  const farm = await insertFarm(a)
  await seedCounts(farm)
  const r = await t.asUser(a, (tx) =>
    tx.query<{ current_tree_count: number }>(
      'select current_tree_count from farms_with_trees where id = $1',
      [farm],
    ),
  )
  expect(r.rows[0].current_tree_count).toBe(380)
})

test("user B cannot see A's varieties or tree counts", async () => {
  const a = await t.createUser()
  const b = await t.createUser()
  const farm = await insertFarm(a)
  await seedCounts(farm)
  await t.asService((tx) =>
    tx.query(`insert into farm_varieties(farm_id, variety_name, tree_count) values ($1, 'Tall', 100)`, [farm]),
  )
  const v = await t.asUser(b, (tx) => tx.query('select * from farm_varieties'))
  const c = await t.asUser(b, (tx) => tx.query('select * from farm_tree_counts'))
  expect(v.rows).toHaveLength(0)
  expect(c.rows).toHaveLength(0)
  const own = await t.asUser(a, (tx) => tx.query('select * from farm_varieties'))
  expect(own.rows).toHaveLength(1)
})

test('user B cannot insert a farm owned by A', async () => {
  const a = await t.createUser()
  const b = await t.createUser()
  await expect(
    t.asUser(b, (tx) =>
      tx.query(
        `insert into farms(user_id, name, latitude, longitude, acreage) values ($1, 'x', 1, 1, 1)`,
        [a],
      ),
    ),
  ).rejects.toThrow()
})

test("user A cannot move a variety to B's farm", async () => {
  const a = await t.createUser()
  const b = await t.createUser()
  const farmA = await insertFarm(a)
  const farmB = await insertFarm(b)
  const v = await t.asService((tx) =>
    tx.query<{ id: string }>(
      `insert into farm_varieties(farm_id, variety_name, tree_count) values ($1, 'Tall', 100) returning id`,
      [farmA],
    ),
  )
  await expect(
    t.asUser(a, (tx) =>
      tx.query(`update farm_varieties set farm_id = $1 where id = $2`, [farmB, v.rows[0].id]),
    ),
  ).rejects.toThrow()
})
