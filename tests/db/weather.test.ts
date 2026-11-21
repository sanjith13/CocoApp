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
      `insert into farms(name, latitude, longitude, acreage) values ('F', 10.5, 76.2, 5) returning id`,
    ),
  )
  return { u, farm: r.rows[0].id }
}

async function putDay(farm: string, date: string, o: { tmax?: number; rain?: number; temp?: number; hum?: number } = {}) {
  await t.asService((tx) =>
    tx.query(
      `insert into weather_daily(farm_id, date, temp_max, temp_mean, humidity_mean, rainfall_mm)
       values ($1, $2, $3, $4, $5, $6)`,
      [farm, date, o.tmax ?? 30, o.temp ?? 27, o.hum ?? 70, o.rain ?? 0],
    ),
  )
}

async function setNormal(farm: string, month: number, mm: number) {
  await t.asService((tx) =>
    tx.query(`insert into farm_climate_normals(farm_id, month, mean_rainfall_mm) values ($1, $2, $3)`, [farm, month, mm]),
  )
}

async function june(u: string) {
  const r = await t.asUser(u, (tx) =>
    tx.query<{ climate_class: string | null; heatwave: boolean; heavy_rain: boolean; total_rain: string }>(
      `select * from weather_monthly where month = '2025-06-01'`,
    ),
  )
  return r.rows[0]
}

describe('climate_class', () => {
  it.each([
    [50, 'dry'],
    [150, 'wet'],
    [100, 'normal'],
  ])('june total %s -> %s', async (total, cls) => {
    const { u, farm } = await setup()
    await setNormal(farm, 6, 100)
    await putDay(farm, '2025-06-10', { rain: total })
    expect((await june(u)).climate_class).toBe(cls)
  })
  it('null when no normal', async () => {
    const { u, farm } = await setup()
    await putDay(farm, '2025-06-10', { rain: 50 })
    expect((await june(u)).climate_class).toBeNull()
  })
})

describe('heatwave / heavy rain', () => {
  it('38,39,38 consecutive -> heatwave', async () => {
    const { u, farm } = await setup()
    await putDay(farm, '2025-06-10', { tmax: 38 })
    await putDay(farm, '2025-06-11', { tmax: 39 })
    await putDay(farm, '2025-06-12', { tmax: 38 })
    expect((await june(u)).heatwave).toBe(true)
  })
  it('38,37,38 -> no heatwave', async () => {
    const { u, farm } = await setup()
    await putDay(farm, '2025-06-10', { tmax: 38 })
    await putDay(farm, '2025-06-11', { tmax: 37 })
    await putDay(farm, '2025-06-12', { tmax: 38 })
    expect((await june(u)).heatwave).toBe(false)
  })
  it('64.5 mm day -> heavy_rain; 64.4 -> not', async () => {
    const { u, farm } = await setup()
    await putDay(farm, '2025-06-10', { rain: 64.5 })
    expect((await june(u)).heavy_rain).toBe(true)
    await t.asService((tx) => tx.query(`update weather_daily set rainfall_mm = 64.4`))
    expect((await june(u)).heavy_rain).toBe(false)
  })
})

describe('harvest_weather', () => {
  it('counts days with data over (period_start, harvest_date]', async () => {
    const { u, farm } = await setup()
    const h = await t.asUser(u, (tx) =>
      tx.query<{ id: string }>(
        `insert into harvests(farm_id, harvest_date, method, mudi_count) values ($1, '2025-06-30', 'mudi', 10) returning id`,
        [farm],
      ),
    )
    // period: (2025-05-16, 2025-06-30] = 45 days; fill 40 of them
    const start = new Date('2025-05-17T00:00:00Z')
    for (let i = 0; i < 45; i++) {
      if (i % 9 === 4) continue // skips 5 days
      const d = new Date(start.getTime() + i * 86400000).toISOString().slice(0, 10)
      await putDay(farm, d)
    }
    // a day outside the period must not count
    await putDay(farm, '2025-05-16')
    const r = await t.asUser(u, (tx) =>
      tx.query<{ days_with_data: number; days_in_period: number; avg_temp: string }>(
        `select * from harvest_weather($1)`,
        [h.rows[0].id],
      ),
    )
    expect(r.rows[0].days_with_data).toBe(40)
    expect(r.rows[0].days_in_period).toBe(45)
    expect(Number(r.rows[0].avg_temp)).toBe(27)
  })
})

describe('RLS', () => {
  it('owner reads, other user does not, authenticated cannot write', async () => {
    const { u, farm } = await setup()
    await putDay(farm, '2025-06-10')
    const other = await t.createUser()
    const mine = await t.asUser(u, (tx) => tx.query(`select 1 from weather_daily`))
    const theirs = await t.asUser(other, (tx) => tx.query(`select 1 from weather_daily`))
    expect(mine.rows).toHaveLength(1)
    expect(theirs.rows).toHaveLength(0)
    await expect(
      t.asUser(u, (tx) => tx.query(`insert into weather_daily(farm_id, date) values ($1, '2025-06-11')`, [farm])),
    ).rejects.toThrow()
    await expect(
      t.asUser(u, (tx) => tx.query(`insert into farm_climate_normals(farm_id, month, mean_rainfall_mm) values ($1, 1, 1)`, [farm])),
    ).rejects.toThrow()
  })
})
