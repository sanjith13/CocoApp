# CocoApp

A mobile-friendly web app for tracking a coconut farm: tree counts, harvests, market rates, weather, fertilizer, pests and per-harvest reports. Built for a single owner who logs in with an account created in Supabase; public sign-up is disabled.

## Features

- **Farms and tree-count history**: record tree counts over time for each farm.
- **Harvest entry**: log harvests in mudi or ton, with the rate for the day.
- **Market rates**: track coconut market rates.
- **Weather**: automatic daily weather from Open-Meteo, backfilled when a farm is created, with each month classified as dry or wet.
- **Fertilizer**: NPK tracking and before/after comparison.
- **Pests**: record pest observations and treatments.
- **Dashboard**: summary analytics and charts.
- **Harvest report**: a per-harvest report with a copyable AI prompt.

## Tech stack

- Next.js 16 (App Router) with React 19 and TypeScript
- Supabase (Postgres, Auth, Row Level Security) via `@supabase/ssr` and `@supabase/supabase-js`
- Tailwind CSS and shadcn-style UI components, Recharts for charts
- Zod for validation
- Vitest with PGlite (in-process Postgres) for tests
- Vercel for hosting and cron

## Prerequisites

- Node.js 24 or newer
- npm
- A Supabase project (see [Database](#database))

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the environment file from the template:

   ```bash
   cp .env.example .env.local
   ```

   On Windows PowerShell, use `Copy-Item .env.example .env.local`.

3. Fill in `.env.local`:

   | Variable | Where to find it |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → Data API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API Keys (publishable / anon key) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Project Settings → API Keys (secret / service_role key) |
   | `CRON_SECRET` | A random string you generate (see below) |

   Generate `CRON_SECRET` with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

> **Warning:** `SUPABASE_SERVICE_ROLE_KEY` bypasses Row Level Security. Keep it secret. Never commit it, never prefix it with `NEXT_PUBLIC_`, and never use it in browser code. `.env*` files are git-ignored (except `.env.example`), so keep it that way.

## Database

The schema lives in `supabase/migrations` (`0001` to `0008`, applied in order).

1. Log in to the Supabase CLI:

   ```bash
   npx supabase login
   ```

2. Link the project (the project ref is the ID in your project URL):

   ```bash
   npx supabase link --project-ref <ref>
   ```

3. Apply the migrations:

   ```bash
   npx supabase db push
   ```

4. In the Supabase dashboard:
   - Authentication settings: turn off **Allow new users to sign up**.
   - Authentication → Users: click **Add user** and create the owner's account. Enable **Auto Confirm User** so no email confirmation is needed.

## Running and testing

```bash
npm run dev     # start the dev server at http://localhost:3000
npm test        # run the test suite (uses in-process PGlite Postgres; no Docker needed)
npm run build   # production build
```

## Deploy to Vercel

1. Push the repository to GitHub, then import it in Vercel (or run `npx vercel` from the project directory).
2. In the Vercel project settings, add these environment variables for Production (and Preview, if you use it):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CRON_SECRET`
3. Deploy.

The weather cron is defined in `vercel.json`: `/api/cron/weather` runs daily at `30 1 * * *` UTC (07:00 IST). Vercel sends `CRON_SECRET` as the bearer token automatically, and the route rejects requests without it. Check the run history under Vercel → Cron Jobs.

## Post-deploy checklist

Run through this on a phone:

- [ ] Log in with the owner account.
- [ ] Create a farm. Weather history should backfill for it.
- [ ] Log a mudi harvest with a market rate.
- [ ] Open the harvest report and copy the AI prompt.
- [ ] The dashboard renders.
- [ ] The next morning, a new `weather_daily` row exists for each farm, and Vercel → Cron Jobs shows a 200 for `/api/cron/weather`.

## Project layout

```
src/
  app/          Next.js routes: (auth) login, (app) feature pages (dashboard, farms, harvests, market, fertilizer, pests, weather, reports), api/cron (weather cron route)
  lib/
    domain/     dashboard analytics, harvest calculations, date and format helpers
    reports/    harvest report generation, snapshots and AI prompt
    supabase/   Supabase server, browser, middleware and admin clients
    validation/ Zod schemas (farm, harvest, market, fertilizer, pest)
    weather/    Open-Meteo client and daily ingest
supabase/
  migrations/   SQL migrations 0001 to 0008
tests/
  db/           database tests run against PGlite (Postgres in-process)
  fixtures/     test fixtures
  unit/         unit tests (validation, domain logic, weather, prompt, cron auth)
vercel.json     cron schedule
.env.example    environment variable template
```
