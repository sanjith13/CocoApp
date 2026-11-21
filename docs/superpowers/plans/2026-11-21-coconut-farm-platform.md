# Coconut Farm Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mobile-first web app that logs coconut harvests, fertilizer, market rates and pests per farm, auto-fetches weather, and produces a dashboard plus a per-harvest report and copyable AI prompt.

**Architecture:** Next.js App Router (TypeScript) on Vercel; Supabase Postgres + Auth with row-level security. Analytics (totals, per-tree figures, NPK, before/after windows, month classes) live in SQL views/functions under `supabase/migrations/`; the app reads them through supabase-js. Small pure TS helpers exist only for live form previews and external-API parsing. Weather comes from Open-Meteo via a daily Vercel Cron route.

**Tech Stack:** Next.js (latest stable, App Router, `src/` dir), TypeScript, Tailwind CSS, shadcn/ui, Recharts, Zod, `@supabase/supabase-js`, `@supabase/ssr`, Supabase CLI (`npx supabase`), Vitest, `@electric-sql/pglite` (in-process Postgres for SQL tests — Docker is not installed on this machine).

**Spec:** `docs/superpowers/specs/2026-11-21-coconut-farm-platform-design.md` (also the doc "Coconut Farm Platform — Design"). Executors read both.

## Global Constraints

- 1 mudi = 200 nuts. `coconut_count = mudi_count * 200 + extra_nuts`.
- Harvest `method` ∈ {`mudi`, `ton`}; one method and one `sale_rate` per harvest (no split sales). Rate is ₹/nut for mudi, ₹/ton for ton; nullable (unsold).
- Nut-based and ton-based production are never summed or drawn on one series. Revenue (₹) may be summed.
- "Change vs previous harvest" compares same farm **and** same method. Report period starts at the farm's previous harvest of **any** method (first harvest: 45 days back).
- Per-tree figures use `tree_count_on(farm_id, date)` from `farm_tree_counts` (dated history), never the current count.
- `market_rates.rate_type` ∈ {`whole_nut_per_nut`, `dehusked_per_ton`, `copra_per_kg`}; copra never feeds revenue. `source` ∈ {`manual`, `harvest_form`}.
- Month class: rainfall < 60 % of the 10-year same-month mean = `dry`; > 140 % = `wet`; else `normal`. Heatwave = ≥ 3 consecutive days `temp_max >= 38`. Heavy rain = any day `rainfall_mm >= 64.5`.
- Fertilizer before/after: baseline window 90 days before application; after-windows (months) [0,1), [1,2), [2,3), [3,6). Caption verbatim: "Before/after comparison — weather and season also affect yield."
- Seed fertilizers: Urea 46-0-0, DAP 18-46-0, MOP 0-0-60, SSP 0-16-0, 17-17-17.
- Pest pick list: Rhinoceros Beetle, Red Palm Weevil, Leaf Rot, Root Wilt (+ custom). Severity ∈ {`low`,`medium`,`high`}.
- Markets pick list: Kangayam, Pollachi, Udumalpet (+ custom).
- Every table has RLS enabled; a user only ever sees their own rows. Public sign-up disabled (email + password; owner creates users in Supabase dashboard).
- INR (₹), metric, dates are calendar dates in `Asia/Kolkata`. "Today" defaults are computed in Asia/Kolkata, not UTC.
- Mobile-first: bottom tab bar on < 768 px (Dashboard, Harvest +, Farms, More); sidebar ≥ 768 px. Harvest form core fields fit one phone screen.
- No AI API calls anywhere. No automatic market-rate fetching.
- Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`) only in server code; never imported by a client component.

## Review Focus

1. **Farm switches method** (mudi then ton then mudi): change % compares only to the previous same-method harvest; the first harvest of a method shows "—", never 0 % or ∞. Test in Task 3.
2. **Zero or missing divisor** (tree count 0, acreage 0, baseline yield 0): per-tree/per-acre/% values are `null` and render "—", no division error. Tests in Tasks 2, 6.
3. **Backdated entry** (harvest or application dated before the farm's first tree-count row): `tree_count_on` falls back to the earliest row. Test in Task 2.
4. **Late-night "today"**: between 00:00 and 05:30 IST the default date is the IST date, not the UTC date. Test in Task 4.
5. **Harvest edited or deleted**: reports for that harvest and the farm's next harvest are regenerated (their period changed); deleting a harvest deletes its report. Test in Task 10.

---

## File Structure

```
supabase/
  config.toml                      # from `npx supabase init`
  migrations/
    0001_core.sql                  # farms, farm_tree_counts, farm_varieties, tree_count_on, RLS
    0002_harvest_market.sql        # harvests, market_rates, harvest_stats view, latest_rates view
    0003_weather.sql               # weather_daily, farm_climate_normals, weather_monthly view, harvest_weather fn
    0004_fertilizer.sql            # fertilizer_master(+seed), fertilizer_applications, npk view, fertilizer_effect fn
    0005_pests.sql                 # pest_incidents, pest_monthly view
    0006_dashboard.sql             # dashboard_kpis fn, production_monthly/yearly views, market_avg views
    0007_reports.sql               # reports table
src/
  app/
    (auth)/login/page.tsx
    (app)/layout.tsx               # auth guard + nav
    (app)/dashboard/page.tsx
    (app)/farms/{page.tsx,new/page.tsx,[id]/page.tsx,actions.ts}
    (app)/harvests/{page.tsx,new/page.tsx,[id]/page.tsx,actions.ts}
    (app)/market/{page.tsx,actions.ts}
    (app)/fertilizer/{page.tsx,master/page.tsx,actions.ts}
    (app)/pests/{page.tsx,actions.ts}
    (app)/weather/[farmId]/page.tsx
    (app)/reports/{page.tsx,[id]/page.tsx}
    api/cron/weather/route.ts
  middleware.ts
  lib/
    supabase/{server.ts,browser.ts,admin.ts,middleware.ts}
    domain/{harvest.ts,dates.ts,format.ts}
    weather/{openMeteo.ts,ingest.ts}
    validation/{farm.ts,harvest.ts,market.ts,fertilizer.ts,pest.ts}
    reports/{snapshot.ts,prompt.ts,generate.ts}
  components/
    nav/{BottomTabs.tsx,Sidebar.tsx}
    charts/{LineTrend.tsx,BarSeries.tsx,StackedBars.tsx}
    kpi/KpiCard.tsx
tests/
  db/harness.ts                    # PGlite + Supabase auth stubs + migrations
  db/*.test.ts
  unit/*.test.ts
  fixtures/open-meteo-*.json
vercel.json
.env.example
```

---

### Task 1: Scaffold, test harness, git

**Files:**
- Create: whole Next.js app via CLI, `vitest.config.ts`, `tests/db/harness.ts`, `tests/db/harness.test.ts`, `.env.example`, `supabase/config.toml`
- Test: `tests/db/harness.test.ts`

**Interfaces:**
- Produces: `createTestDb(): Promise<TestDb>` where `TestDb = { db: PGlite; asUser<T>(userId: string, fn: (tx: Transaction) => Promise<T>): Promise<T>; asService<T>(fn): Promise<T>; createUser(): Promise<string> }`. `asUser` runs `fn` in a transaction after `set local role authenticated` and `set_config('request.jwt.claims', '{"sub":"<id>","role":"authenticated"}', true)`. `asService` runs as the superuser (bypasses RLS, like service_role).

- [ ] **Step 1: Init repo and app**

Run in `D:\CocoApp`: `git init`, then `npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm` (keep existing `docs/`). Then `npm i @supabase/supabase-js @supabase/ssr zod recharts` and `npm i -D vitest @electric-sql/pglite @vitejs/plugin-react vite-tsconfig-paths supabase`. Then `npx shadcn@latest init` (defaults) and `npx supabase init`.
Add scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.
`.env.example`: `NEXT_PUBLIC_SUPABASE_URL=`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=`, `SUPABASE_SERVICE_ROLE_KEY=`, `CRON_SECRET=`.

- [ ] **Step 2: Write failing harness test**

```ts
// tests/db/harness.test.ts
import { createTestDb } from './harness'
test('auth.uid() returns the impersonated user', async () => {
  const t = await createTestDb()
  const u = await t.createUser()
  const r = await t.asUser(u, tx => tx.query<{ uid: string }>('select auth.uid() as uid'))
  expect(r.rows[0].uid).toBe(u)
})
```

- [ ] **Step 3: Run** `npx vitest run tests/db/harness.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 4: Implement `tests/db/harness.ts`**

Bootstrap SQL before migrations: `create schema auth; create table auth.users(id uuid primary key);` `auth.uid()` reading `request.jwt.claims`->>'sub'; roles `anon`, `authenticated`, `service_role` (nologin). Apply every `supabase/migrations/*.sql` sorted by name. After migrations: `grant usage on schema public to authenticated; grant all on all tables in schema public to authenticated; grant all on all sequences in schema public to authenticated; grant execute on all functions in schema public to authenticated`. `createUser` inserts `gen_random_uuid()` into `auth.users`. `vitest.config.ts`: node environment, `vite-tsconfig-paths`, `testTimeout: 20000`.

- [ ] **Step 5: Run** `npm test` — Expected: PASS.

- [ ] **Step 6: Commit** — `git add -A && git commit -m "chore: scaffold Next.js app, Supabase config, PGlite test harness"` (ensure `.env*` except `.env.example` is gitignored).

---

### Task 2: Core schema — farms, tree-count history, varieties

**Files:**
- Create: `supabase/migrations/0001_core.sql`
- Test: `tests/db/core.test.ts`

**Interfaces:**
- Produces tables:
  - `farms(id uuid pk default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users on delete cascade, name text not null, location_text text, latitude numeric(8,5) not null, longitude numeric(8,5) not null, acreage numeric(8,2) not null check (acreage >= 0), soil_type text, active boolean not null default true, created_at timestamptz default now(), updated_at timestamptz default now())`
  - `farm_tree_counts(id, farm_id uuid references farms on delete cascade, effective_date date not null, tree_count int not null check (tree_count >= 0), unique(farm_id, effective_date))`
  - `farm_varieties(id, farm_id, variety_name text not null, tree_count int not null check (tree_count >= 0))`
- Produces functions: `tree_count_on(p_farm uuid, p_date date) returns int` — latest row with `effective_date <= p_date`; if none, the earliest row; null if farm has no rows. `current_tree_count(p_farm uuid) returns int`.
- Produces view `farms_with_trees` (farms + `current_tree_count`), `security_invoker = true`.
- RLS: `farms` policy `user_id = auth.uid()` for all commands; child tables policy `exists (select 1 from farms f where f.id = farm_id and f.user_id = auth.uid())`. Same child-policy pattern is reused by every later farm-scoped table.

- [ ] **Step 1: Write failing tests** in `tests/db/core.test.ts`:
  - `user B cannot see or update user A's farm` — A inserts farm; B's `select` returns 0 rows; B's `update ... set name='x'` affects 0 rows.
  - `user B cannot insert tree counts for A's farm` — expect error.
  - `tree_count_on uses count in force on date` — rows (2026-01-01, 400), (2026-06-01, 380): `tree_count_on(f,'2026-03-15') = 400`, `'2026-06-01' = 380`.
  - `tree_count_on falls back to earliest row for backdated date` — `'2025-12-01' = 400`.
  - `farms_with_trees shows latest count` — 380.

- [ ] **Step 2: Run** `npx vitest run tests/db/core.test.ts` — Expected: FAIL (relation "farms" does not exist).
- [ ] **Step 3: Write `0001_core.sql`** per Interfaces, plus an `updated_at` trigger function `set_updated_at()` reused by later tables.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** — `feat(db): farms, tree-count history, varieties with RLS`.

---

### Task 3: Harvests and market rates schema

**Files:**
- Create: `supabase/migrations/0002_harvest_market.sql`
- Test: `tests/db/harvest.test.ts`

**Interfaces:**
- `harvests(id, farm_id, harvest_date date not null, method text not null check (method in ('mudi','ton')), mudi_count numeric(8,1), extra_nuts int not null default 0, coconut_count int generated always as (case when method='mudi' then round(mudi_count*200)::int + extra_nuts end) stored, weight_ton numeric(8,3), sale_rate numeric(12,2), revenue numeric(14,2) generated always as (case when method='mudi' then (round(mudi_count*200) + extra_nuts) * sale_rate else weight_ton * sale_rate end) stored, notes text, timestamps)`; check: `(method='mudi' and mudi_count > 0 and weight_ton is null) or (method='ton' and weight_ton > 0 and mudi_count is null)`; unique `(farm_id, harvest_date)`.
- `market_rates(id, user_id default auth.uid(), market_name text not null, date date not null, rate_type text check in (...), rate numeric(12,2) not null check (rate > 0), source text not null default 'manual' check in ('manual','harvest_form'), harvest_id uuid null references harvests on delete set null)`.
- View `harvest_stats` (security_invoker): every harvest column plus `quantity numeric` (coconut_count or weight_ton), `unit text` ('nuts'|'ton'), `trees int` = `tree_count_on(farm_id, harvest_date)`, `per_tree numeric` (null when trees = 0), `prev_same_method_quantity`, `change_pct numeric` (null when no previous or previous = 0) via `lag()` partitioned by `(farm_id, method)` ordered by `harvest_date`, `prev_any_date date` via `lag(harvest_date)` partitioned by `farm_id`, `period_start date = coalesce(prev_any_date, harvest_date - 45)`.
- View `latest_rates` (security_invoker): latest row per `(user_id, market_name, rate_type)`.
- Function `estimated_revenue(p_harvest uuid) returns numeric` — null if `sale_rate` set; else quantity × latest rate (any market, latest date) of `whole_nut_per_nut` for mudi or `dehusked_per_ton` for ton; null if no rate.

- [ ] **Step 1: Write failing tests:**
  - `mudi harvest computes nuts and revenue` — mudi 120, extra 15, rate 12 → coconut_count 24015, revenue 288180.
  - `ton harvest revenue` — 2.5 t at 28000 → 70000.
  - `rejects ton harvest with mudi_count` — expect error.
  - `change_pct compares same method only` — mudi 100 (Jan), ton 3.0 (Feb), mudi 110 (Mar), ton 2.7 (Apr): Mar change_pct = 10.00, Apr = -10.00, Jan and Feb null.
  - `period_start uses previous harvest of any method` — Mar's period_start = Feb date; Jan's = Jan date − 45.
  - `per_tree null when tree count is 0`.
  - `estimated_revenue uses latest matching rate` — unsold mudi 100 (20000 nuts), whole_nut rates 10 (Jan 1) and 12 (Jan 5) → 240000; sold harvest → null.
  - `RLS: other user sees no harvests or rates`.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Write `0002_harvest_market.sql`.**
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** — `feat(db): harvests, market rates, harvest stats`.

---

### Task 4: Auth, Supabase clients, app shell, shared domain helpers

**Files:**
- Create: `src/lib/supabase/{server.ts,browser.ts,admin.ts,middleware.ts}`, `src/middleware.ts`, `src/app/(auth)/login/page.tsx`, `src/app/(app)/layout.tsx`, `src/components/nav/{BottomTabs.tsx,Sidebar.tsx}`, `src/lib/domain/{dates.ts,harvest.ts,format.ts}`
- Test: `tests/unit/domain.test.ts`

**Interfaces:**
- `createServerClient(): SupabaseClient` (server components/actions, cookie-based, `@supabase/ssr`); `createBrowserClient()`; `createAdminClient()` (service role, file starts with `import 'server-only'`).
- `isPublicPath(path: string): boolean` — true for `/login`, `/api/cron/*`, Next static assets.
- `todayIST(now?: Date): string` → `YYYY-MM-DD` in Asia/Kolkata.
- `nutsFromMudi(mudi: number, extra?: number): number`; `previewRevenue(method: 'mudi'|'ton', qty: number, extra: number, rate: number | null): number | null` (same formula as SQL; for live form preview only).
- `formatINR(n: number | null): string` ('—' for null), `formatPct(n: number | null): string` ('▲ 10.0%' / '▼ 10.0%' / '—').

- [ ] **Step 1: Write failing tests:** `todayIST(new Date('2026-11-20T20:00:00Z')) === '2026-11-21'`; `todayIST(new Date('2026-11-21T10:00:00Z')) === '2026-11-21'`; `nutsFromMudi(120, 15) === 24015`; `previewRevenue('ton', 2.5, 0, 28000) === 70000`; `previewRevenue('mudi', 1, 0, null) === null`; `formatPct(null) === '—'`; `isPublicPath('/login')`, `!isPublicPath('/dashboard')`.
- [ ] **Step 2: Run** `npx vitest run tests/unit/domain.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** helpers; middleware refreshes session and redirects unauthenticated non-public paths to `/login`. Login page: email + password via `signInWithPassword`, no sign-up link. `(app)/layout.tsx` renders `BottomTabs` (`md:hidden`) and `Sidebar` (`hidden md:flex`); tabs: Dashboard `/dashboard`, Harvest + `/harvests/new`, Farms `/farms`, More (sheet: Harvests, Market, Fertilizer, Pests, Weather, Reports, Sign out). `/` redirects to `/dashboard`.
- [ ] **Step 4: Run** `npm test` and `npm run build` — Expected: PASS, build succeeds.
- [ ] **Step 5: Manual check** — create a Supabase dev project (owner does this; put keys in `.env.local`), `npx supabase link`, `npx supabase db push`, create a user in dashboard, disable sign-ups (Auth → Providers → Email → "Allow new users to sign up" off). `npm run dev`: `/dashboard` redirects to `/login`; login works; nav shows bottom tabs at 390 px width.
- [ ] **Step 6: Commit** — `feat: auth, supabase clients, app shell`.

---

### Task 5: Farms UI (location, tree counts, varieties) + weather client

**Files:**
- Create: `src/lib/validation/farm.ts`, `src/app/(app)/farms/{page.tsx,new/page.tsx,[id]/page.tsx,actions.ts}`, `src/lib/weather/openMeteo.ts`, `tests/fixtures/open-meteo-geocode.json`
- Test: `tests/unit/farm-validation.test.ts`, `tests/unit/open-meteo-geocode.test.ts`

**Interfaces:**
- `farmSchema` (Zod): name 1–80 chars; latitude −90..90; longitude −180..180; acreage ≥ 0; tree_count int ≥ 0; soil_type, location_text optional. `varietySchema`: variety_name, tree_count int ≥ 0.
- `geocode(query: string, fetchFn = fetch): Promise<Array<{ name: string; admin1?: string; latitude: number; longitude: number }>>` — GET `https://geocoding-api.open-meteo.com/v1/search?name=<q>&count=5&language=en&format=json`; returns `[]` when `results` missing.
- Server actions: `createFarm(form)` → inserts farm + first `farm_tree_counts` row (effective_date = `todayIST()`). Task 7 adds the weather backfill call to this action. `updateFarm`, `changeTreeCount(farmId, treeCount, effectiveDate)` (upsert on `(farm_id, effective_date)`), `upsertVarieties(farmId, rows)`.
- Farm form: location search box → geocode results list → pick sets lat/long; "Use my location" button (`navigator.geolocation`); lat/long editable. Variety editor shows soft warning when variety total ≠ current tree count.

- [ ] **Step 1: Write failing tests:** schema rejects latitude 91, accepts acreage 0; `geocode` with fixture returns first result `{ name: 'Kangayam', latitude: 11.0, longitude: 77.56 }` (fixture values) and `[]` for `{}` body (inject `fetchFn`).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** schemas, `geocode`, actions, pages (list shows name, location, trees, acreage; detail shows tree-count history table newest first with "Change tree count" form).
- [ ] **Step 4: Run** `npm test` — Expected: PASS. Manual: create farm on phone width, change tree count, history shows both rows.
- [ ] **Step 5: Commit** — `feat: farms with location, tree-count history, varieties`.

---

### Task 6: Harvest entry + market rates UI

**Files:**
- Create: `src/lib/validation/{harvest.ts,market.ts}`, `src/app/(app)/harvests/{page.tsx,new/page.tsx,[id]/page.tsx,actions.ts}`, `src/app/(app)/market/{page.tsx,actions.ts}`
- Test: `tests/unit/harvest-validation.test.ts`

**Interfaces:**
- `harvestSchema`: discriminated union on `method`; mudi: `mudi_count > 0` (step 0.5), `extra_nuts` int 0–199; ton: `weight_ton > 0` (3 decimals); `sale_rate` optional > 0; `save_as_market_rate` boolean; `market_name` required when `save_as_market_rate && sale_rate`.
- `buildHarvestWrites(input: HarvestInput): { harvest: HarvestRow; marketRate: MarketRateRow | null }` — pure; marketRate has `rate_type` `whole_nut_per_nut` (mudi) or `dehusked_per_ton` (ton), `source: 'harvest_form'`, `date = harvest_date`.
- Actions: `saveHarvest(form)` (insert or update; then `generateReportsAround(harvestId)` from Task 10 — Task 10 wires it), `deleteHarvest(id)`, `addMarketRate(form)`.
- Harvest form per spec §7.4: farm (default last used — store in `localStorage` key `coco.lastFarm`, wrapped in try/catch), date default `todayIST()`, method toggle default = farm's last method, big numeric input (`inputMode="decimal"`), live "= N nuts" and live revenue via `previewRevenue`, rate label ₹/nut or ₹/ton, checkbox default on when rate entered, market name default last used. Duplicate (farm, date) shows "A harvest already exists for this farm on this date".
- Harvest list: from `harvest_stats`, newest first, shows quantity + unit, change % (`formatPct`), revenue or "est. ₹…" from `estimated_revenue`.
- Market page: quick-add form (market pick list + custom, rate type, rate, date default today) and table of latest rates + recent entries.

- [ ] **Step 1: Write failing tests:** mudi input with weight_ton rejected; `extra_nuts` 200 rejected; `buildHarvestWrites` mudi with rate 12 + save flag → marketRate `{ rate_type: 'whole_nut_per_nut', rate: 12, source: 'harvest_form' }`; without rate → `marketRate === null`; ton → `dehusked_per_ton`.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` — PASS. Manual at 390 px: core fields visible without scrolling; a mudi harvest saves in < 30 s; switching method relabels rate.
- [ ] **Step 5: Commit** — `feat: harvest entry and market rates`.

---

### Task 7: Weather ingestion and classification

**Files:**
- Create: `supabase/migrations/0003_weather.sql`, `src/lib/weather/ingest.ts`, `src/app/api/cron/weather/route.ts`, `src/app/(app)/weather/[farmId]/page.tsx`, `vercel.json`, `tests/fixtures/open-meteo-daily.json`
- Modify: `src/lib/weather/openMeteo.ts`, `src/app/(app)/farms/actions.ts` (call backfill after create / lat-long change)
- Test: `tests/db/weather.test.ts`, `tests/unit/open-meteo-daily.test.ts`, `tests/unit/cron-auth.test.ts`

**Interfaces:**
- `weather_daily(farm_id, date, temp_min, temp_max, temp_mean, humidity_mean, rainfall_mm, windspeed_max, weather_code int, weather_type text, primary key (farm_id, date))`; RLS select via farm; no insert/update policy for `authenticated` (service role writes).
- `farm_climate_normals(farm_id, month smallint 1–12, mean_rainfall_mm numeric, primary key (farm_id, month))`; RLS select via farm.
- View `weather_monthly` (security_invoker): per farm per month: `avg_temp`, `total_rain`, `avg_humidity`, `climate_class` ('dry'|'wet'|'normal'|null when no normal), `heatwave boolean`, `heavy_rain boolean` (Global Constraints thresholds; heatwave via gaps-and-islands on consecutive dates with `temp_max >= 38`).
- Function `harvest_weather(p_harvest uuid)` returns `(avg_temp, total_rain, avg_humidity, days_with_data int, days_in_period int, heatwave bool, heavy_rain bool)` over `(period_start, harvest_date]` from `harvest_stats`.
- `fetchDaily(lat, lon, start: string, end: string, opts: { archive: boolean }, fetchFn = fetch): Promise<WeatherDay[]>` — archive host `https://archive-api.open-meteo.com/v1/archive`, recent host `https://api.open-meteo.com/v1/forecast` with `past_days=7&forecast_days=1`; `daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,relative_humidity_2m_mean,precipitation_sum,wind_speed_10m_max,weather_code&timezone=Asia%2FKolkata`. Drops days with all-null values and future dates.
- `wmoToType(code: number): 'Sunny'|'Cloudy'|'Rainy'|'Storm'` — 0–1 Sunny; 2–3, 45, 48, 71–77, 85–86 Cloudy; 51–67, 80–82 Rainy; 95–99 Storm.
- `backfillFarmWeather(farmId)` — archive for last 12 months + compute normals from archive of the previous 10 full years (monthly sums averaged per calendar month), upsert both via `createAdminClient()`.
- `ingestRecentWeather()` — for each active farm, recent endpoint, upsert. Returns `{ farms: number, rows: number, errors: string[] }`; one farm failing does not stop others.
- Route `GET /api/cron/weather`: 401 unless `Authorization: Bearer ${CRON_SECRET}`; else runs `ingestRecentWeather` and returns its JSON. `vercel.json`: `{"crons":[{"path":"/api/cron/weather","schedule":"30 1 * * *"}]}` (07:00 IST).

- [ ] **Step 1: Write failing tests:**
  - unit: `fetchDaily` parses fixture into `WeatherDay` with `weather_type`; `wmoToType(63) === 'Rainy'`, `wmoToType(95) === 'Storm'`, `wmoToType(0) === 'Sunny'`.
  - unit: route handler without/with wrong bearer → 401 (import `GET` with `ingestRecentWeather` mocked via `vi.mock`).
  - db: normal 100 mm for June; June total 50 → 'dry'; 150 → 'wet'; 100 → 'normal'; no normal → null.
  - db: temp_max 38, 39, 38 on consecutive days → heatwave true; 38, 37, 38 → false; one day 64.5 mm → heavy_rain true.
  - db: `harvest_weather` with 40 of 45 days present → `days_with_data = 40`, `days_in_period = 45`.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.** Weather page: per-farm table (newest first) + temperature/rainfall/humidity charts (charts components land in Task 9; here a plain table only is acceptable, charts added in Task 9).
- [ ] **Step 4: Run** `npm test` — PASS. Manual: create farm → `weather_daily` has ~365 rows and 12 normals; `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/weather` returns rows > 0.
- [ ] **Step 5: Commit** — `feat: weather backfill, daily cron, month classification`.

---

### Task 8: Fertilizer tracking and before/after analysis

**Files:**
- Create: `supabase/migrations/0004_fertilizer.sql`, `src/lib/validation/fertilizer.ts`, `src/app/(app)/fertilizer/{page.tsx,master/page.tsx,actions.ts}`
- Test: `tests/db/fertilizer.test.ts`

**Interfaces:**
- `fertilizer_master(id, user_id uuid null default auth.uid(), name text not null, n_pct, p_pct, k_pct numeric(5,2) check 0–100)`; seed rows with `user_id null`; RLS select `user_id is null or user_id = auth.uid()`, write only own rows.
- `fertilizer_applications(id, farm_id, date, fertilizer_id references fertilizer_master, quantity_kg numeric(10,2) > 0, notes)`; RLS via farm.
- View `fertilizer_npk` (security_invoker): application + `n_kg, p_kg, k_kg` (= qty × pct/100), `trees = tree_count_on(farm_id, date)`, `n_per_tree_kg…` (null when trees 0), `n_per_acre_kg…` (null when acreage 0).
- Function `fertilizer_effect(p_application uuid)` returns rows `(window_label text, from_month int, to_month int, harvests int, avg_per_tree numeric, change_pct numeric)` per method present: baseline row `'baseline'` = avg `per_tree` of same-farm harvests with `harvest_date in [D-90, D)`; window rows `'0-1'`,`'1-2'`,`'2-3'`,`'3-6'` with `harvest_date in [D + from months, D + to months)`; computed separately per `method` (column `method text` included). `change_pct` null when baseline null/0 or window empty.
- Fertilizer page: application form (farm, date default today, fertilizer select, kg), table of applications with NPK totals and per tree, and per-application expandable before/after table with the verbatim caption; empty windows show "not enough harvests yet".

- [ ] **Step 1: Write failing tests:**
  - seed contains Urea 46-0-0 and is visible to any user; user-added fertilizer invisible to another user.
  - 50 kg Urea on farm with 400 trees, 2 acres → n_kg 23, n_per_tree_kg 0.0575, n_per_acre_kg 11.5.
  - `fertilizer_effect`: harvests (mudi) per_tree baseline avg 50 nuts/tree (two harvests in prior 90 days at 48 and 52), harvest at D+40 days 55/tree → window '1-2' change_pct 10.00; window '3-6' empty → harvests 0, change_pct null.
  - tree count changes between baseline and window → per_tree uses the count on each harvest date.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** — `feat: fertilizer tracking, NPK and before/after analysis`.

---

### Task 9: Pests + dashboard analytics and charts

**Files:**
- Create: `supabase/migrations/0005_pests.sql`, `supabase/migrations/0006_dashboard.sql`, `src/lib/validation/pest.ts`, `src/app/(app)/pests/{page.tsx,actions.ts}`, `src/app/(app)/dashboard/page.tsx`, `src/components/charts/{LineTrend.tsx,BarSeries.tsx,StackedBars.tsx}`, `src/components/kpi/KpiCard.tsx`
- Modify: `src/app/(app)/weather/[farmId]/page.tsx` (add charts)
- Test: `tests/db/dashboard.test.ts`

**Interfaces:**
- `pest_incidents(id, farm_id, date, pest_name text not null, severity text check in ('low','medium','high'), remarks)`; RLS via farm. View `pest_monthly(farm_id, month date, incidents int, high int, medium int, low int)`.
- Views (security_invoker): `production_monthly(farm_id, method, month date, quantity, revenue)`, `production_yearly(farm_id, method, year int, quantity, revenue)`, `production_seasonal(farm_id, method, cal_month int, avg_quantity, years int)`, `market_weekly(user_id, market_name, rate_type, week date, avg_rate)`, `market_monthly(…, month date, avg_rate)`, `npk_monthly(farm_id, month, n_kg, p_kg, k_kg)`.
- Function `dashboard_kpis(p_farm uuid default null)` returns one row: `total_farms int, total_trees int, last_harvest_qty numeric, last_harvest_unit text, last_change_pct numeric, month_avg_temp numeric, month_class text, rate_whole_nut numeric, rate_dehusked numeric, rate_copra numeric, revenue_ytd numeric` (YTD = calendar year in IST; actual revenue only; null farm = all of the user's active farms).
- Dashboard page: farm selector (All + each farm, via `?farm=`), KPI cards grid (2 cols on phone), panels as tabs: Production (nuts/tons sub-tabs; per-harvest line, monthly bars, yearly bars, farm comparison per tree; seasonal shows "Needs a full year of harvests" when `years < 1`), Weather, Fertilizer (NPK stacked bars + yield-vs-NPK overlay), Market (price trend per market/type, actual vs estimated revenue), Pests (incidents/month, severity stacked).
- Charts are client components wrapping Recharts, props `{ data: Array<Record<string, number|string|null>>; xKey: string; series: Array<{ key: string; label: string; unit: string }> }`.

- [ ] **Step 1: Write failing tests:**
  - `production_monthly` never mixes methods: mudi and ton in same month → two rows.
  - `dashboard_kpis` for a user with 2 farms (400 + 300 trees) → total_trees 700; revenue_ytd sums only sold harvests of current year; another user's data excluded.
  - `pest_monthly` counts by severity.
  - `market_monthly` averages 10 and 12 → 11.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `npm test` + `npm run build` — PASS.
- [ ] **Step 5: Manual** — seed a few harvests/rates/applications in dev; dashboard readable at 390 px and 1280 px; empty account shows friendly empty states, no chart errors.
- [ ] **Step 6: Commit** — `feat: pests, dashboard analytics and charts`.

---

### Task 10: Harvest report and AI prompt

**Files:**
- Create: `supabase/migrations/0007_reports.sql`, `src/lib/reports/{snapshot.ts,prompt.ts,generate.ts}`, `src/app/(app)/reports/{page.tsx,[id]/page.tsx}`
- Modify: `src/app/(app)/harvests/actions.ts` (call `generateReportsAround` after save/delete)
- Test: `tests/unit/prompt.test.ts`, `tests/db/reports.test.ts`

**Interfaces:**
- `reports(id, farm_id, harvest_id uuid unique references harvests on delete cascade, period_start date, period_end date, snapshot jsonb not null, prompt_text text not null, generated_at timestamptz default now())`; RLS via farm.
- `type ReportSnapshot = { farm: { name; location; acreage; soilType; trees; varieties: {name; trees}[] }; harvest: { date; method; quantity; unit: 'mudi'|'ton'; nuts?: number; previous: { quantity; unit } | null; changePct: number | null; rate: number | null; revenue: number | null; estimatedRevenue: number | null }; weather: { avgTemp; totalRain; avgHumidity; climateClass; heatwave; heavyRain; daysWithData; daysInPeriod }; fertilizer: { used: { name; kg }[]; nKg; pKg; kKg; nPerTreeKg; pPerTreeKg; kPerTreeKg }; pests: { name; severity; date }[]; market: { wholeNut: number|null; dehusked: number|null; copra: number|null }; period: { start; end } }`
- `buildSnapshot(supabase, harvestId): Promise<ReportSnapshot>` — reads `harvest_stats`, `harvest_weather`, `fertilizer_npk` (date in period), `pest_incidents` (in period), `latest_rates`, varieties, `farms_with_trees`.
- `renderPrompt(s: ReportSnapshot): string` — exact template below; lines whose value is null are omitted; numbers: temp 1 dp, rain 0 dp, NPK 1 dp kg.
- `generateReportsAround(harvestId)` — regenerates report for this harvest and the farm's next harvest (by date); on delete, regenerates the next harvest's report.

Prompt template (exact copy; `{…}` substituted):
```
I own a coconut farm.

Farm location:
{location_text}

Trees: {trees} ({varieties joined as "Tall 300, Dwarf 100"})
Area: {acreage} acres

Current harvest ({date}):
{quantity} {unit}{ " (" + nuts + " nuts)" when mudi}

Previous harvest:
{previous quantity} {previous unit}

Harvest period: {start} to {end}

Average temperature:
{avgTemp}°C

Rainfall:
{totalRain} mm

Average humidity:
{avgHumidity}%

Fertilizer supplied:
N = {nKg} kg
P = {pKg} kg
K = {kKg} kg

Pest/disease incidents:
{name (severity) per line, or "None reported"}

Current market rates:
Whole coconut: ₹{wholeNut}/nut
Dehusked coconut: ₹{dehusked}/ton
Copra: ₹{copra}/kg

Suggest:

1. How to improve yield.
2. Whether fertilizer application is adequate.
3. Possible reasons for yield changes.
4. Pest prevention recommendations.
5. Irrigation recommendations.
```
- Report page: sections Farm, Harvest, Weather (with "Weather data for {daysWithData} of {daysInPeriod} days" when partial), Fertilizer, Pests, Market; **Copy prompt** button (`navigator.clipboard.writeText`, shows "Copied"); **Share** (`navigator.share({ text: prompt })`, falls back to copy); **Print** (`window.print()`, print CSS hides nav/buttons). Reports list: per farm, newest first.

- [ ] **Step 1: Write failing tests:**
  - unit `renderPrompt`: full snapshot (mudi 120, prev 110 mudi, temp 34, rain 125, N 45 P 20 K 50, copra 145) matches an inline expected string exactly; snapshot with `previous: null` and no market rates omits those lines; zero pests prints "None reported".
  - db `reports`: saving harvests H1 (Jan), H2 (Mar) then inserting H1.5 (Feb) via the same SQL path used by `generateReportsAround` → H2 report `period_start` becomes Feb date; deleting H1.5 → H2 `period_start` back to Jan date, H1.5 report gone (cascade). (Test the SQL-level pieces: period from `harvest_stats` and cascade; the TS orchestration is covered by calling `generateReportsAround` with a PGlite-backed adapter, or, if impractical, by a unit test with a stubbed client asserting both harvest ids are regenerated.)
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `npm test` — PASS.
- [ ] **Step 5: Manual** — save a harvest → "View harvest report" opens; Copy prompt pastes the expected text; print preview hides nav.
- [ ] **Step 6: Commit** — `feat: harvest report and AI prompt`.

---

### Task 11: Deploy

**Files:**
- Modify: `README.md` (setup, env vars, deploy steps)

- [ ] **Step 1:** `npm test` and `npm run build` — all pass.
- [ ] **Step 2:** Owner: create production Supabase project; `npx supabase link --project-ref <ref>`; `npx supabase db push`; disable public sign-up; create owner user.
- [ ] **Step 3:** Owner: import repo in Vercel (or `npx vercel`), set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` (Vercel sends it as the bearer automatically for cron jobs). Deploy.
- [ ] **Step 4: Verify on phone:** login, create farm (weather backfills), log a mudi harvest with rate, view report, copy prompt, dashboard renders. Next morning: new `weather_daily` row exists (Vercel → Cron Jobs log shows 200).
- [ ] **Step 5: Commit** — `docs: setup and deploy guide`.
