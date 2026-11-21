import { createTestDb, type TestDb } from './harness'

let t: TestDb
beforeEach(async () => {
  t = await createTestDb()
})
afterEach(async () => {
  await t.close()
})

async function setup(acreage = 2) {
  const u = await t.createUser()
  const r = await t.asUser(u, (tx) =>
    tx.query<{ id: string }>(
      `insert into farms(name, latitude, longitude, acreage) values ('F', 10.5, 76.2, $1) returning id`,
      [acreage],
    ),
  )
  return { u, farm: r.rows[0].id }
}

async function setTrees(farm: string, date: string, count: number) {
  await t.asService((tx) =>
    tx.query(`insert into farm_tree_counts(farm_id, effective_date, tree_count) values ($1, $2, $3)`, [
      farm,
      date,
      count,
    ]),
  )
}

async function addHarvest(u: string, farm: string, date: string, mudi: number) {
  await t.asUser(u, (tx) =>
    tx.query(`insert into harvests(farm_id, harvest_date, method, mudi_count) values ($1, $2, 'mudi', $3)`, [
      farm,
      date,
      mudi,
    ]),
  )
}

async function applyUrea(u: string, farm: string, date: string, kg = 50): Promise<string> {
  const r = await t.asUser(u, (tx) =>
    tx.query<{ id: string }>(
      `insert into fertilizer_applications(farm_id, date, fertilizer_id, quantity_kg)
       select $1, $2, id, $3 from fertilizer_master where name = 'Urea' returning id`,
      [farm, date, kg],
    ),
  )
  return r.rows[0].id
}

async function effect(u: string, app: string) {
  const r = await t.asUser(u, (tx) => tx.query<any>('select * from fertilizer_effect($1)', [app]))
  return r.rows
}

test('seed fertilizers are visible to any user; own additions are private', async () => {
  const a = await t.createUser()
  const b = await t.createUser()
  const seen = await t.asUser(b, (tx) => tx.query<any>('select name, n_pct, p_pct, k_pct from fertilizer_master'))
  const names = seen.rows.map((r: any) => r.name)
  for (const n of ['Urea', 'DAP', 'MOP', 'SSP', '17-17-17']) expect(names).toContain(n)
  const urea = seen.rows.find((r: any) => r.name === 'Urea')
  expect([Number(urea.n_pct), Number(urea.p_pct), Number(urea.k_pct)]).toEqual([46, 0, 0])

  await t.asUser(a, (tx) =>
    tx.query(`insert into fertilizer_master(name, n_pct, p_pct, k_pct) values ('Mine', 1, 2, 3)`),
  )
  const mineA = await t.asUser(a, (tx) => tx.query(`select * from fertilizer_master where name = 'Mine'`))
  const mineB = await t.asUser(b, (tx) => tx.query(`select * from fertilizer_master where name = 'Mine'`))
  expect(mineA.rows).toHaveLength(1)
  expect(mineB.rows).toHaveLength(0)
  await expect(
    t.asUser(a, (tx) => tx.query(`insert into fertilizer_master(user_id, name) values (null, 'Sneaky')`)),
  ).rejects.toThrow()
  const del = await t.asUser(a, (tx) => tx.query(`delete from fertilizer_master where name = 'Urea' returning id`))
  expect(del.rows).toHaveLength(0)
})

test('NPK totals, per tree and per acre', async () => {
  const { u, farm } = await setup(2)
  await setTrees(farm, '2026-01-01', 400)
  const app = await applyUrea(u, farm, '2026-03-01', 50)
  const r = await t.asUser(u, (tx) => tx.query<any>('select * from fertilizer_npk where id = $1', [app]))
  const row = r.rows[0]
  expect(Number(row.n_kg)).toBe(23)
  expect(Number(row.p_kg)).toBe(0)
  expect(row.trees).toBe(400)
  expect(Number(row.n_per_tree_kg)).toBeCloseTo(0.0575, 6)
  expect(Number(row.n_per_acre_kg)).toBeCloseTo(11.5, 6)
})

test('NPK per tree / per acre null on zero divisor', async () => {
  const { u, farm } = await setup(0)
  await setTrees(farm, '2026-01-01', 0)
  const app = await applyUrea(u, farm, '2026-03-01', 50)
  const r = await t.asUser(u, (tx) => tx.query<any>('select * from fertilizer_npk where id = $1', [app]))
  expect(r.rows[0].n_per_tree_kg).toBeNull()
  expect(r.rows[0].n_per_acre_kg).toBeNull()
})

test('RLS: other user cannot see or write applications', async () => {
  const { u, farm } = await setup()
  const b = await t.createUser()
  await applyUrea(u, farm, '2026-03-01')
  const r = await t.asUser(b, (tx) => tx.query('select * from fertilizer_applications'))
  expect(r.rows).toHaveLength(0)
  const v = await t.asUser(b, (tx) => tx.query('select * from fertilizer_npk'))
  expect(v.rows).toHaveLength(0)
  await expect(applyUrea(b, farm, '2026-03-02')).rejects.toThrow()
})

// With 100 trees, 1 mudi = 2 nuts/tree.
test('fertilizer_effect: baseline, window change, empty window', async () => {
  const { u, farm } = await setup()
  await setTrees(farm, '2025-01-01', 100)
  await addHarvest(u, farm, '2025-12-15', 24) // 48/tree
  await addHarvest(u, farm, '2026-02-15', 26) // 52/tree
  await addHarvest(u, farm, '2026-04-10', 27.5) // 55/tree, D + 40 days
  const app = await applyUrea(u, farm, '2026-03-01')
  const rows = await effect(u, app)
  const by = (l: string) => rows.find((r: any) => r.window_label === l)
  expect(rows.map((r: any) => r.window_label).sort()).toEqual(['0-1', '1-2', '2-3', '3-6', 'baseline'])
  expect(by('baseline').method).toBe('mudi')
  expect(by('baseline').harvests).toBe(2)
  expect(Number(by('baseline').avg_per_tree)).toBe(50)
  expect(by('1-2').harvests).toBe(1)
  expect(Number(by('1-2').avg_per_tree)).toBe(55)
  expect(Number(by('1-2').change_pct)).toBe(10)
  expect(by('3-6').harvests).toBe(0)
  expect(by('3-6').avg_per_tree).toBeNull()
  expect(by('3-6').change_pct).toBeNull()
})

test('fertilizer_effect: per_tree uses the tree count on each harvest date', async () => {
  const { u, farm } = await setup()
  await setTrees(farm, '2025-01-01', 100)
  await setTrees(farm, '2026-03-15', 200)
  await addHarvest(u, farm, '2026-02-15', 25) // 5000 nuts / 100 = 50
  await addHarvest(u, farm, '2026-04-10', 50) // 10000 nuts / 200 = 50
  const app = await applyUrea(u, farm, '2026-03-01')
  const rows = await effect(u, app)
  const w = rows.find((r: any) => r.window_label === '1-2')
  expect(Number(w.avg_per_tree)).toBe(50)
  expect(Number(w.change_pct)).toBe(0)
})

test('fertilizer_effect: no change_pct when baseline missing; methods kept apart', async () => {
  const { u, farm } = await setup()
  await setTrees(farm, '2025-01-01', 100)
  await addHarvest(u, farm, '2026-04-10', 25)
  await t.asUser(u, (tx) =>
    tx.query(`insert into harvests(farm_id, harvest_date, method, weight_ton) values ($1, '2026-02-10', 'ton', 2)`, [farm]),
  )
  const app = await applyUrea(u, farm, '2026-03-01')
  const rows = await effect(u, app)
  const mudi = rows.filter((r: any) => r.method === 'mudi')
  const ton = rows.filter((r: any) => r.method === 'ton')
  expect(mudi.find((r: any) => r.window_label === 'baseline').harvests).toBe(0)
  expect(mudi.find((r: any) => r.window_label === '1-2').change_pct).toBeNull()
  expect(ton.find((r: any) => r.window_label === 'baseline').harvests).toBe(1)
})
