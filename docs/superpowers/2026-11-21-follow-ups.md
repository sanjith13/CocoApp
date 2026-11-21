# MVP follow-ups (deferred review findings)

Collected from task and final reviews on 2026-11-21. None block the MVP.

- Task 3: minor (deferred): extra_nuts no >=0 check, allowed nonzero on ton harvests.
- Task 3: minor (deferred): no test for change_pct when prev qty = 0 (unreachable via constraint).
- Task 3: minor (deferred): report evidence summary-only; report "Implemented" section stale re CHECK.
- Task 4: minor (deferred): 6 no-explicit-any lint errors in tests/db/harvest.test.ts (from Task 3).
- Task 4: minor (deferred): no getUser() defence-in-depth in (app) layout; formatPct(-0.04) shows ▼ 0.0%.
- Task 5: minor (deferred): createFarm cleanup-delete error ignored; foreign/nonexistent farmId returns ok:true for 0-row update; effective_date regex accepts 2026-13-45; duplicate variety names show generic error; variety replace non-atomic.
- Task 6: minor (deferred): edit with non-matching id no error; lastMethod from latest 200 harvests only; stored-farm default flashes; future-date block client-only.
- Task 6: minor (deferred): HarvestActionResult.warning now dead on saveHarvest; estimated_revenue evaluated per view row (perf at scale); unguarded numeric read in list.
- Task 7: minor (deferred): cron bearer compare not constant-time; sequential ingest no maxDuration; current partial month classified vs full normal (Task 9 KPI should use completed months or label partial); old-location rows remain after lat/long move; no test heatwave across month boundary; climate_class null when normal=0; updateFarm moved-check race.
- Task 7: minor (deferred): zero-history location re-fetches archive daily; 29 Feb path only tested via helper.
- Task 7: minor (deferred): empty .in() list no short-circuit; URL length limit ~200 active farms; test fake ignores filter args; normals-fetch failure still counts recent rows.
- Task 8: minor (deferred): quantity_kg display unformatted; per-acre NPK not shown in UI (view has it); seeds re-insert on migration re-run.
- Task 8: minor (deferred): RLS db test asserts only toThrow; getFertilizerEffect returns raw DB error.message (consistent with other actions).
- Task 9: minor (deferred): fetchAll silent stop at 20k rows; seasonal note wording loose; All-farms seasonal shown if any farm qualifies.
- Task 10: minor (deferred): up to 3 sequential snapshots (~27 queries) before redirect; "View harvest report" link 404s for old harvests; reports not regenerated on fertilizer/pest/weather changes (point-in-time by design); db test reimplements upsert inline.
- Task 11: minor (deferred): Supabase/Vercel UI labels unverified against live dashboards.
- Final fix re-review: backfill-retry oldRows query truncates above ~125 active farms; delete actions return ok for RLS-blocked 0-row deletes.
- Final review Important #6 follow-up done (delete buttons); still no edit for rates/applications/pests.
