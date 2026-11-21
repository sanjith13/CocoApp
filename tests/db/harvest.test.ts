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
      `insert into farms(name, latitude, longitude, acreage) values ('F', 10.5, 76.2, 5) returning id`,
    ),
  )
  return r.rows[0].id
}

async function addHarvest(
  user: string,
  farm: string,
  date: string,
  method: 'mudi' | 'ton',
  qty: number,
  opts: { extra?: number; rate?: number | null } = {},
): Promise<string> {
  const r = await t.asUser(user, (tx) =>
    tx.query<{ id: string }>(
      `insert into harvests(farm_id, harvest_date, method, mudi_count, weight_ton, extra_nuts, sale_rate)
       values ($1, $2, $3, $4, $5, $6, $7) returning id`,
      [
        farm,
        date,
        method,
        method === 'mudi' ? qty : null,
        method === 'ton' ? qty : null,
        opts.extra ?? 0,
        opts.rate ?? null,
      ],
    ),
  )
  return r.rows[0].id
}

async function setup() {
  const u = await t.createUser()
  const farm = await insertFarm(u)
  return { u, farm }
}

async function stats(u: string, farm: string) {
  const r = await t.asUser(u, (tx) =>
    tx.query<any>(`select * from harvest_stats where farm_id = $1 order by harvest_date`, [farm]),
  )
  return r.rows
}

test('mudi harvest computes nuts and revenue', async () => {
  const { u, farm } = await setup()
  const id = await addHarvest(u, farm, '2026-01-10', 'mudi', 120, { extra: 15, rate: 12 })
  const r = await t.asUser(u, (tx) =>
    tx.query<any>('select coconut_count, revenue from harvests where id = $1', [id]),
  )
  expect(r.rows[0].coconut_count).toBe(24015)
  expect(Number(r.rows[0].revenue)).toBe(288180)
})

test('ton harvest revenue', async () => {
  const { u, farm } = await setup()
  const id = await addHarvest(u, farm, '2026-01-10', 'ton', 2.5, { rate: 28000 })
  const r = await t.asUser(u, (tx) => tx.query<any>('select revenue from harvests where id = $1', [id]))
  expect(Number(r.rows[0].revenue)).toBe(70000)
})

test('rejects ton harvest with mudi_count', async () => {
  const { u, farm } = await setup()
  await expect(
    t.asUser(u, (tx) =>
      tx.query(
        `insert into harvests(farm_id, harvest_date, method, mudi_count, weight_ton)
         values ($1, '2026-01-10', 'ton', 5, 2)`,
        [farm],
      ),
    ),
  ).rejects.toThrow()
})

test('change_pct compares same method only', async () => {
  const { u, farm } = await setup()
  await addHarvest(u, farm, '2026-01-10', 'mudi', 100)
  await addHarvest(u, farm, '2026-02-10', 'ton', 3.0)
  await addHarvest(u, farm, '2026-03-10', 'mudi', 110)
  await addHarvest(u, farm, '2026-04-10', 'ton', 2.7)
  const rows = await stats(u, farm)
  expect(rows[0].change_pct).toBeNull()
  expect(rows[1].change_pct).toBeNull()
  expect(Number(rows[2].change_pct)).toBeCloseTo(10, 2)
  expect(Number(rows[3].change_pct)).toBeCloseTo(-10, 2)
})

test('period_start uses previous harvest of any method', async () => {
  const { u, farm } = await setup()
  await addHarvest(u, farm, '2026-01-10', 'mudi', 100)
  await addHarvest(u, farm, '2026-02-10', 'ton', 3.0)
  await addHarvest(u, farm, '2026-03-10', 'mudi', 110)
  const rows = await stats(u, farm)
  const ymd = (d: unknown) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10))
  expect(ymd(rows[2].period_start)).toBe('2026-02-10')
  expect(ymd(rows[0].period_start)).toBe('2025-11-26')
})

test('per_tree null when tree count is 0', async () => {
  const { u, farm } = await setup()
  await t.asService((tx) =>
    tx.query(
      `insert into farm_tree_counts(farm_id, effective_date, tree_count) values ($1, '2026-01-01', 0)`,
      [farm],
    ),
  )
  await addHarvest(u, farm, '2026-01-10', 'mudi', 100)
  const rows = await stats(u, farm)
  expect(rows[0].trees).toBe(0)
  expect(rows[0].per_tree).toBeNull()
})

test('per_tree computed when trees present', async () => {
  const { u, farm } = await setup()
  await t.asService((tx) =>
    tx.query(
      `insert into farm_tree_counts(farm_id, effective_date, tree_count) values ($1, '2026-01-01', 100)`,
      [farm],
    ),
  )
  await addHarvest(u, farm, '2026-01-10', 'mudi', 100)
  const rows = await stats(u, farm)
  expect(Number(rows[0].per_tree)).toBe(200)
  expect(rows[0].unit).toBe('nuts')
})

test('estimated_revenue uses latest matching rate', async () => {
  const { u, farm } = await setup()
  const unsold = await addHarvest(u, farm, '2026-01-10', 'mudi', 100)
  const sold = await addHarvest(u, farm, '2026-02-10', 'mudi', 100, { rate: 11 })
  await t.asUser(u, (tx) =>
    tx.query(
      `insert into market_rates(market_name, date, rate_type, rate) values
       ('Kangayam', '2026-01-01', 'whole_nut_per_nut', 10),
       ('Pollachi', '2026-01-05', 'whole_nut_per_nut', 12),
       ('Pollachi', '2026-01-09', 'copra_per_kg', 200)`,
    ),
  )
  const est = (id: string) =>
    t.asUser(u, (tx) => tx.query<any>('select estimated_revenue($1) as v', [id]))
  expect(Number((await est(unsold)).rows[0].v)).toBe(240000)
  expect((await est(sold)).rows[0].v).toBeNull()
})

test('estimated_revenue null when no matching rate', async () => {
  const { u, farm } = await setup()
  const id = await addHarvest(u, farm, '2026-01-10', 'ton', 2)
  const r = await t.asUser(u, (tx) => tx.query<any>('select estimated_revenue($1) as v', [id]))
  expect(r.rows[0].v).toBeNull()
})

test('latest_rates returns latest per market and type', async () => {
  const { u } = await setup()
  await t.asUser(u, (tx) =>
    tx.query(
      `insert into market_rates(market_name, date, rate_type, rate) values
       ('K', '2026-01-01', 'whole_nut_per_nut', 10),
       ('K', '2026-01-05', 'whole_nut_per_nut', 12)`,
    ),
  )
  const r = await t.asUser(u, (tx) => tx.query<any>('select rate from latest_rates'))
  expect(r.rows).toHaveLength(1)
  expect(Number(r.rows[0].rate)).toBe(12)
})

test('RLS: other user sees no harvests or rates', async () => {
  const { u, farm } = await setup()
  const b = await t.createUser()
  await addHarvest(u, farm, '2026-01-10', 'mudi', 100)
  await t.asUser(u, (tx) =>
    tx.query(
      `insert into market_rates(market_name, date, rate_type, rate) values ('K','2026-01-01','whole_nut_per_nut',10)`,
    ),
  )
  for (const table of ['harvests', 'market_rates', 'harvest_stats', 'latest_rates']) {
    const r = await t.asUser(b, (tx) => tx.query(`select * from ${table}`))
    expect(r.rows).toHaveLength(0)
  }
  await expect(
    t.asUser(b, (tx) =>
      tx.query(
        `insert into harvests(farm_id, harvest_date, method, mudi_count) values ($1,'2026-02-01','mudi',5)`,
        [farm],
      ),
    ),
  ).rejects.toThrow()
})
