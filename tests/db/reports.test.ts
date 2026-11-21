import { createTestDb, type TestDb } from './harness'

let t: TestDb
beforeEach(async () => {
  t = await createTestDb()
})
afterEach(async () => {
  await t.close()
})

async function setup() {
  const u = await t.createUser()
  const r = await t.asUser(u, (tx) =>
    tx.query<{ id: string }>(
      `insert into farms(name, latitude, longitude, acreage) values ('F', 10.5, 76.2, 2) returning id`,
    ),
  )
  return { u, farm: r.rows[0].id }
}

async function addHarvest(u: string, farm: string, date: string): Promise<string> {
  const r = await t.asUser(u, (tx) =>
    tx.query<{ id: string }>(
      `insert into harvests(farm_id, harvest_date, method, mudi_count) values ($1, $2, 'mudi', 10) returning id`,
      [farm, date],
    ),
  )
  return r.rows[0].id
}

// The SQL used by generateReportsAround to take the period: (period_start, harvest_date] from harvest_stats.
async function saveReport(u: string, harvest: string) {
  await t.asUser(u, (tx) =>
    tx.query(
      `insert into reports(farm_id, harvest_id, period_start, period_end, snapshot, prompt_text)
       select farm_id, id, period_start, harvest_date, '{}'::jsonb, 'p' from harvest_stats where id = $1
       on conflict (harvest_id) do update
         set period_start = excluded.period_start, period_end = excluded.period_end, generated_at = now()`,
      [harvest],
    ),
  )
}

async function periodStart(u: string, harvest: string): Promise<string | null> {
  const r = await t.asUser(u, (tx) =>
    tx.query<{ period_start: string }>(`select period_start::text from reports where harvest_id = $1`, [harvest]),
  )
  return r.rows[0]?.period_start ?? null
}

test('inserting a harvest between two moves the later report period; deleting restores it and cascades', async () => {
  const { u, farm } = await setup()
  const h1 = await addHarvest(u, farm, '2025-01-15')
  const h2 = await addHarvest(u, farm, '2025-03-15')
  await saveReport(u, h1)
  await saveReport(u, h2)
  expect(await periodStart(u, h1)).toBe('2024-12-01') // first harvest: 45 days back
  expect(await periodStart(u, h2)).toBe('2025-01-15')

  const mid = await addHarvest(u, farm, '2025-02-15')
  await saveReport(u, mid)
  await saveReport(u, h2) // regenerate the next harvest
  expect(await periodStart(u, h2)).toBe('2025-02-15')
  expect(await periodStart(u, mid)).toBe('2025-01-15')

  await t.asUser(u, (tx) => tx.query('delete from harvests where id = $1', [mid]))
  expect(await periodStart(u, mid)).toBeNull() // cascade
  await saveReport(u, h2)
  expect(await periodStart(u, h2)).toBe('2025-01-15')
})

test('one report per harvest and reports are private to the farm owner', async () => {
  const { u, farm } = await setup()
  const other = await t.createUser()
  const h = await addHarvest(u, farm, '2025-01-15')
  await saveReport(u, h)
  await saveReport(u, h)
  const mine = await t.asUser(u, (tx) => tx.query('select 1 from reports'))
  expect(mine.rows).toHaveLength(1)
  const theirs = await t.asUser(other, (tx) => tx.query('select 1 from reports'))
  expect(theirs.rows).toHaveLength(0)
  await expect(
    t.asUser(other, (tx) =>
      tx.query(
        `insert into reports(farm_id, harvest_id, period_start, period_end, snapshot, prompt_text)
         values ($1, $2, '2025-01-01', '2025-01-15', '{}', 'x')`,
        [farm, h],
      ),
    ),
  ).rejects.toThrow()
})
