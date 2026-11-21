import { createTestDb, type TestDb } from './harness'

let t: TestDb
beforeEach(async () => {
  t = await createTestDb()
})
afterEach(async () => {
  await t.close()
})

async function farmFor(u: string, name = 'F') {
  const r = await t.asUser(u, (tx) =>
    tx.query<{ id: string }>(
      `insert into farms(name, latitude, longitude, acreage) values ($1, 10.5, 76.2, 2) returning id`,
      [name],
    ),
  )
  return r.rows[0].id
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

const istYear = () => new Date(Date.now() + 5.5 * 3600_000).getUTCFullYear()

test('production_monthly never mixes methods', async () => {
  const u = await t.createUser()
  const farm = await farmFor(u)
  await t.asUser(u, async (tx) => {
    await tx.query(`insert into harvests(farm_id, harvest_date, method, mudi_count) values ($1, '2025-03-05', 'mudi', 2)`, [farm])
    await tx.query(`insert into harvests(farm_id, harvest_date, method, weight_ton) values ($1, '2025-03-20', 'ton', 1.5)`, [farm])
  })
  const r = await t.asUser(u, (tx) =>
    tx.query<any>(`select method, month::text as month, quantity from production_monthly order by method`),
  )
  expect(r.rows).toHaveLength(2)
  expect(r.rows.map((x: any) => [x.method, x.month, Number(x.quantity)])).toEqual([
    ['mudi', '2025-03-01', 400],
    ['ton', '2025-03-01', 1.5],
  ])
})

test('dashboard_kpis sums trees and YTD revenue per user, sold harvests only', async () => {
  const u = await t.createUser()
  const other = await t.createUser()
  const f1 = await farmFor(u, 'A')
  const f2 = await farmFor(u, 'B')
  const fo = await farmFor(other, 'O')
  await setTrees(f1, '2020-01-01', 400)
  await setTrees(f2, '2020-01-01', 300)
  await setTrees(fo, '2020-01-01', 999)
  const y = istYear()
  await t.asUser(u, async (tx) => {
    // 200 nuts * 10 = 2000
    await tx.query(
      `insert into harvests(farm_id, harvest_date, method, mudi_count, sale_rate) values ($1, $2, 'mudi', 1, 10)`,
      [f1, `${y}-01-02`],
    )
    // unsold
    await tx.query(`insert into harvests(farm_id, harvest_date, method, mudi_count) values ($1, $2, 'mudi', 5)`, [f2, `${y}-01-03`])
    // last year
    await tx.query(
      `insert into harvests(farm_id, harvest_date, method, weight_ton, sale_rate) values ($1, $2, 'ton', 2, 100)`,
      [f2, `${y - 1}-06-01`],
    )
    await tx.query(`insert into market_rates(market_name, date, rate_type, rate) values ('K', '2025-01-01', 'copra_per_kg', 130)`)
  })
  await t.asUser(other, (tx) =>
    tx.query(
      `insert into harvests(farm_id, harvest_date, method, mudi_count, sale_rate) values ($1, $2, 'mudi', 10, 50)`,
      [fo, `${y}-01-02`],
    ),
  )
  const all = await t.asUser(u, (tx) => tx.query<any>('select * from dashboard_kpis()'))
  expect(all.rows).toHaveLength(1)
  const k = all.rows[0]
  expect(k.total_farms).toBe(2)
  expect(k.total_trees).toBe(700)
  expect(Number(k.revenue_ytd)).toBe(2000)
  expect(Number(k.rate_copra)).toBe(130)
  expect(k.rate_whole_nut).toBeNull()
  const one = await t.asUser(u, (tx) => tx.query<any>('select * from dashboard_kpis($1)', [f2]))
  expect(one.rows[0].total_trees).toBe(300)
  expect(Number(one.rows[0].revenue_ytd)).toBe(0)
})

test('dashboard_kpis month_class uses the latest completed month only', async () => {
  const u = await t.createUser()
  const farm = await farmFor(u)
  const now = new Date(Date.now() + 5.5 * 3600_000)
  const first = (offset: number) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1)).toISOString().slice(0, 10)
  const prev = first(-1)
  await t.asService(async (tx) => {
    await tx.query(`insert into farm_climate_normals(farm_id, month, mean_rainfall_mm) values ($1, $2, 100)`, [
      farm,
      Number(prev.slice(5, 7)),
    ])
    await tx.query(`insert into weather_daily(farm_id, date, temp_mean, rainfall_mm) values ($1, $2, 30, 10)`, [farm, prev])
    await tx.query(`insert into weather_daily(farm_id, date, temp_mean, rainfall_mm) values ($1, $2, 20, 500)`, [farm, first(0)])
  })
  const r = await t.asUser(u, (tx) => tx.query<any>('select *, month_class_month::text as mcm from dashboard_kpis()'))
  expect(r.rows[0].month_class).toBe('dry')
  expect(r.rows[0].mcm).toBe(prev)
  expect(Number(r.rows[0].month_avg_temp)).toBe(20)
})

test('pest_monthly counts by severity', async () => {
  const u = await t.createUser()
  const farm = await farmFor(u)
  await t.asUser(u, async (tx) => {
    for (const [d, s] of [
      ['2025-04-01', 'high'],
      ['2025-04-10', 'high'],
      ['2025-04-11', 'medium'],
      ['2025-04-12', 'low'],
      ['2025-05-01', 'low'],
    ]) {
      await tx.query(`insert into pest_incidents(farm_id, date, pest_name, severity) values ($1, $2, 'Root Wilt', $3)`, [farm, d, s])
    }
  })
  const r = await t.asUser(u, (tx) =>
    tx.query<any>(`select month::text as month, incidents, high, medium, low from pest_monthly order by month`),
  )
  expect(r.rows).toEqual([
    { month: '2025-04-01', incidents: 4, high: 2, medium: 1, low: 1 },
    { month: '2025-05-01', incidents: 1, high: 0, medium: 0, low: 1 },
  ])
})

test('pest_incidents rejects bad severity and other users', async () => {
  const u = await t.createUser()
  const other = await t.createUser()
  const farm = await farmFor(u)
  await expect(
    t.asUser(u, (tx) =>
      tx.query(`insert into pest_incidents(farm_id, date, pest_name, severity) values ($1, '2025-01-01', 'x', 'bad')`, [farm]),
    ),
  ).rejects.toThrow()
  await expect(
    t.asUser(other, (tx) =>
      tx.query(`insert into pest_incidents(farm_id, date, pest_name, severity) values ($1, '2025-01-01', 'x', 'low')`, [farm]),
    ),
  ).rejects.toThrow()
})

test('market_monthly averages 10 and 12 to 11', async () => {
  const u = await t.createUser()
  await t.asUser(u, async (tx) => {
    await tx.query(`insert into market_rates(market_name, date, rate_type, rate) values ('K', '2025-02-03', 'whole_nut_per_nut', 10)`)
    await tx.query(`insert into market_rates(market_name, date, rate_type, rate) values ('K', '2025-02-20', 'whole_nut_per_nut', 12)`)
  })
  const r = await t.asUser(u, (tx) => tx.query<any>('select avg_rate from market_monthly'))
  expect(r.rows).toHaveLength(1)
  expect(Number(r.rows[0].avg_rate)).toBe(11)
})

test('production_coverage reports span and distinct calendar months per method', async () => {
  const u = await t.createUser()
  const farm = await farmFor(u)
  await t.asUser(u, async (tx) => {
    for (const d of ['2024-01-10', '2024-12-20', '2025-01-15']) {
      await tx.query(`insert into harvests(farm_id, harvest_date, method, mudi_count) values ($1, $2, 'mudi', 1)`, [farm, d])
    }
  })
  const r = await t.asUser(u, (tx) =>
    tx.query<any>(`select method, first_date::text as f, last_date::text as l, cal_months from production_coverage`),
  )
  expect(r.rows).toEqual([{ method: 'mudi', f: '2024-01-10', l: '2025-01-15', cal_months: 2 }])
})
