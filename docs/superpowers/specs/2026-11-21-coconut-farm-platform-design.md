# Coconut Farm Intelligence Platform — Design

Date: 2026-11-21
Status: Approved by owner 2026-11-21
Decisions: one method + one rate per harvest (no split sales); tree count kept as dated history.
Source requirements: `C:\Users\Sanjith.M\Downloads\CocoApp.txt` (PRD), refined in brainstorming conversation.

## 1. Intent

A coconut farmer keeps harvest, fertilizer and sale records by hand; history gets lost and nothing is correlated. This app replaces the notebook with a phone-friendly web app and turns the records into insight: how season, weather and fertilizer relate to yield, how yield trends over cycles and years, and whether the price received was good.

Harvest happens roughly every 45 days per farm. Each harvest is a natural reporting point: the app produces a consolidated report and a copy-ready AI prompt the farmer pastes into ChatGPT/Gemini/Claude/Copilot for advice.

Primary user today: the owner, managing their own farms. Later: other farmers may be given access, each seeing only their own data.

No historical data exists. Everything starts fresh from first use.

## 2. Goals

- Record every harvest per farm, in either of the two ways the farmer actually sells:
  - **Mudi** — whole coconuts, sold per nut. 1 mudi = 200 nuts.
  - **Ton** — dehusked coconuts, weighed, sold per ton.
- Record the rate actually received per harvest; compute real revenue.
- Fetch daily weather per farm automatically; classify months (dry / wet / normal).
- Track fertilizer applications; compute N, P, K supplied (total, per tree, per acre); show yield before vs after application.
- Track market rates (manual entry) as a reference for selling decisions.
- Track pest and disease incidents.
- Dashboard with KPI cards and production / weather / fertilizer / market panels.
- Per-harvest report (template, no AI call) plus copyable AI prompt.
- Works well on a phone; harvest entry fast enough to do in the field.

## 3. Non-goals (this phase)

- Yield comparison by tree variety (owner confirmed not required). Varieties are stored as farm info only (distribution shown in farm summary / report).
- Calling any AI model. Reports are templates; the prompt is copied by the user.
- Automatic market-rate fetching. No public API exists for KisanDeals or the Kangayam market board; data.gov.in/AGMARKNET coverage of Kangayam copra is uncertain. Revisit as a later experiment.
- Satellite soil data, soil moisture, yield prediction, disease photo detection (PRD P2).
- Historical data import (no old data exists).
- Tamil UI, voice input, offline-first, WhatsApp delivery, QR tree tracking, copra inventory, multi-user shared farms.

## 4. Anti-goals (failure even if it works)

- Harvest entry that is slow or fiddly on a phone. If logging a harvest takes more than ~30 seconds, the farmer goes back to the notebook.
- Mixing nut counts and tons in one number or chart line. They are different products and cannot be summed.
- Presenting fertilizer "effectiveness" as proven cause. It is a before/after comparison; UI must label it as such.
- One user ever seeing another user's data.

## 5. Constraints

- Frontend: Next.js (App Router, TypeScript), deployed on Vercel.
- Backend: Supabase (Postgres, Auth, Row Level Security).
- Mobile-responsive is mandatory; design mobile-first.
- Currency INR (₹), metric units, dates in Asia/Kolkata.
- Free tiers where possible (Vercel Hobby, Supabase Free, Open-Meteo).

## 6. Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A (chosen)** | Next.js + Supabase; aggregations (totals, averages, NPK, before/after windows) computed in Postgres views/functions | More DB setup up front; analytics stay correct and fast as data grows, single source of truth |
| B | Same stack, aggregation in app code | Faster start; logic duplicated across pages, slows with years of data |
| — | Firebase | Dropped: weak at aggregate/relational queries this app is built around |

Owner picked **A**. Weather source: **Open-Meteo** (free, no API key, forecast + historical archive) — builder's call, replacing OpenWeatherMap/Visual Crossing/WeatherAPI suggested in the PRD.

## 7. Design

### 7.1 Accounts and data isolation

- Supabase Auth, email + password (no SMS cost). *Call: builder.*
- Every user-owned table has `user_id` (default `auth.uid()`), with RLS policies `user_id = auth.uid()` for select/insert/update/delete. Child tables may enforce via the parent farm instead, but every table must have RLS enabled.
- Built multi-user from day one even though one user today.
- Public sign-up disabled. Owner adds other farmers from the Supabase dashboard. *Call.*
- Copra rate (`copra_per_kg`) is reference only: shown on market panel and in the prompt when present; never feeds revenue. *Call.*
- Report period starts at the farm's previous harvest of any method. *Call.*

### 7.2 Data model

All tables: `id uuid pk`, `created_at`, `updated_at`.

**farms** — `user_id`, `name`, `location_text` (village/district), `latitude`, `longitude` (required: drives weather), `acreage numeric`, `soil_type text`, `tree_count int`, `active bool`.
Location capture: user types a place name, app geocodes via Open-Meteo geocoding API and lets them confirm; or "use my current location" from the phone. Lat/long editable.

**farm_tree_counts** — `farm_id`, `effective_date`, `tree_count`. Dated history; unique (farm_id, effective_date). `farms.tree_count` is kept in sync as the latest value (or replaced by a view). All per-tree analytics (yield/tree, NPK/tree, before/after) use the count in force on the harvest/application date. Creating a farm inserts the first row.

**farm_varieties** — `farm_id`, `variety_name` (Tall / Dwarf / Hybrid / Local / custom), `tree_count`. Informational only. Sum need not equal farm tree_count (no hard validation; show a soft warning if it differs).

**harvests** — `farm_id`, `harvest_date`, `method` enum(`mudi`,`ton`),
- mudi: `mudi_count numeric` (allows halves), `coconut_count int` = mudi_count × 200 (generated column; user may override with an exact count if some loose nuts — *call: store `extra_nuts int default 0`, coconut_count = mudi×200 + extra_nuts*),
- ton: `weight_ton numeric(8,3)`,
- `sale_rate numeric` — rate received: ₹ per nut for mudi, ₹ per ton for ton. Nullable (not yet sold).
- `revenue` generated = coconut_count × rate, or weight_ton × rate.
- `notes`.
Check constraint: fields match method.

**weather_daily** — `farm_id`, `date` (unique per farm), `temp_min`, `temp_max`, `temp_mean`, `humidity_mean`, `rainfall_mm`, `windspeed_max`, `weather_code`, `weather_type` (Sunny / Cloudy / Rainy / Storm, mapped from WMO code). System-written, user read-only.

**fertilizer_master** — `user_id` nullable (null = global seed, visible to all), `name`, `n_pct`, `p_pct`, `k_pct`. Seed: Urea 46-0-0, DAP 18-46-0, MOP 0-0-60, SSP 0-16-0, plus a few common complexes (e.g. 17-17-17). Users can add their own.

**fertilizer_applications** — `farm_id`, `date`, `fertilizer_id`, `quantity_kg`, `notes`.
Derived (view): `n_kg = qty × n_pct/100` (same for P, K); per tree = ÷ farm.tree_count; per acre = ÷ farm.acreage.

**market_rates** — `user_id`, `market_name` (Kangayam, Pollachi, Udumalpet, custom), `date`, `rate_type` enum(`whole_nut_per_nut`, `dehusked_per_ton`, `copra_per_kg`), `rate`, `source` enum(`manual`, `harvest_form`).

**pest_incidents** — `farm_id`, `date`, `pest_name` (pick list: Rhinoceros Beetle, Red Palm Weevil, Leaf Rot, Root Wilt, + custom), `severity` enum(`low`,`medium`,`high`), `remarks`.

**reports** — `farm_id`, `harvest_id` (unique), `period_start`, `period_end`, `snapshot jsonb` (all figures frozen at generation), `prompt_text`, `generated_at`.

Not built now: `soil_records` (P2).

### 7.3 Weather ingestion

- On farm create (or lat/long change): backfill the previous 12 months from Open-Meteo historical API so the first harvest has weather context and monthly normals exist.
- Daily: Vercel Cron (once/day, allowed on Hobby) hits a protected route (`CRON_SECRET`) that, for each active farm, fetches yesterday (and fills any gaps up to 7 days) and upserts `weather_daily`. Uses the Supabase service-role key server-side only.
- **Monthly classification** (*builder call*): compare month rainfall to the same-month average over the last 10 years for that location (fetched once from Open-Meteo archive and cached, e.g. `farm_climate_normals` table). Dry < 60% of normal, Wet > 140%, else Normal. Heatwave flag: ≥3 consecutive days with temp_max ≥ 38 °C. Heavy-rain flag: any day ≥ 64.5 mm (IMD "heavy rain").

### 7.4 Harvest entry (the critical screen)

Mobile-first single form:
1. Farm (defaults to last used).
2. Date (defaults today).
3. Method toggle: **Mudi** | **Ton** (defaults to farm's last method).
4. Quantity (big numeric input). Mudi shows live "= N nuts".
5. Rate received (optional) — labelled ₹/nut or ₹/ton per method. Shows live revenue.
6. Checkbox "also save as today's market rate" (default on when rate entered) + market name (defaults last used) → writes `market_rates` with `source=harvest_form`.
7. Save → offers "View harvest report".

Target: ≤ 30 s, no scrolling past fold for the core fields on a phone.

### 7.5 Analytics (Postgres views / RPC functions)

Production is always reported **per method**: nuts series and tons series are never summed. Revenue (₹) may be summed across methods.

- Harvest trend: per-harvest series (≈45-day cadence), monthly, yearly totals per farm and all farms.
- Change vs previous harvest (same farm, same method): absolute and %.
- Yield per tree (nuts/tree, or kg/tree) for farm comparison.
- Seasonal view: average per calendar month across years (meaningful after ≥1 year; show "needs more data" until then).
- Weather per harvest period: aggregates of weather_daily between previous harvest date (exclusive) and this harvest date.
- Fertilizer:
  - NPK supplied per period / month / farm, per tree, per acre.
  - Before/after comparison for each application on date D: baseline = mean yield/tree of same-method harvests in the 90 days before D; compare harvests falling in windows 0–1, 1–2, 2–3, 3–6 months after D. Show % change per window. Shown with caption "Before/after comparison — weather and season also affect yield." Show "not enough harvests" when a window is empty.
- Market: daily series, weekly and monthly averages per market and rate_type.
- Expected revenue for unsold harvest (sale_rate null): quantity × latest market rate of matching type (whole_nut_per_nut for mudi, dehusked_per_ton for ton), labelled "estimate".
- Pests: incident count per month, severity trend, per farm.

### 7.6 Dashboard

Farm selector (All farms | individual). Mobile: cards stack, charts full-width, panels as tabs or accordion.

KPI cards: Total farms, Total trees, Last harvest (qty + unit), Yield change % vs previous, This month's avg temperature + climate class, Current market rate (latest of each type), Revenue this year.

Panels:
- Production: per-harvest line, monthly bars, yearly bars, farm comparison (per tree). Nuts and tons as separate charts/tabs.
- Weather: temperature, rainfall, humidity trends; monthly classification strip; current-day summary card.
- Fertilizer: NPK supplied (stacked bars), yield vs NPK overlay, before/after table.
- Market: price trend by market/type, revenue (actual) and estimate.
- Pests: incident count, severity trend.

Charts: Recharts. Trend indicators (▲/▼ with %).

### 7.7 Harvest report + AI prompt

Generated automatically when a harvest is saved (and regeneratable). Period = previous harvest date → this harvest date (first harvest: 45 days back).

Snapshot contents (per PRD): farm summary (name, location, acreage, soil, trees, variety distribution); harvest (current, previous, growth %, revenue); weather (avg temp, total rainfall, avg humidity, climate class, heatwave/heavy-rain flags); fertilizer (fertilizers used, NPK kg total / per tree); pests (incidents in period); market (latest rates, revenue or estimate).

Report page: readable on phone, printable (print CSS), "Share" via Web Share API (falls back to copy) for WhatsApp.

Prompt: filled template following the PRD example, using the period's figures, ending with the five "Suggest:" questions (yield, fertilizer adequacy, reasons for change, pest prevention, irrigation). One-tap **Copy prompt** button. Units stated explicitly (mudi/nuts or tons; ₹/nut or ₹/ton).

### 7.8 Screens

Login/sign-up · Dashboard · Farms (list, create/edit incl. varieties & location) · Harvests (list, add/edit) · Fertilizer (applications list/add, master list/add) · Market rates (list, quick add) · Pests (list/add) · Weather (per-farm daily table + charts, read-only) · Reports (list per farm, report detail with copy prompt).
Navigation: bottom tab bar on mobile (Dashboard, Harvest+, Farms, More), sidebar on desktop.

### 7.9 Project structure (*builder call*)

Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui components, Recharts, `@supabase/ssr`. Supabase migrations in `supabase/migrations/` (SQL, versioned). Server Actions for writes, Zod validation. Unit tests (Vitest) for calculation logic (NPK, revenue, classification, before/after windows); SQL views tested via seeded local Supabase where practical.

## 8. Priority / build order

1. Project scaffold, auth, RLS, farms (+ varieties, location/geocode).
2. Harvest tracking + market rates (incl. rate from harvest form).
3. Weather ingestion (backfill + cron) + monthly classification.
4. Fertilizer master + applications + NPK calcs.
5. Dashboard + analytics views.
6. Harvest report + AI prompt.
7. Pest tracking (PRD P1).
8. Deploy to Vercel + Supabase project.

## 9. Left to the builder

Visual styling, component library details, chart styling, exact pick-list contents, error/empty states, geocoding UX details, test depth beyond calculation logic. Items marked *call* above are builder-chosen defaults the owner can override.
