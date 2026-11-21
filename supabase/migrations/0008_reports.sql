-- Harvest reports: a stored snapshot plus the copy-ready AI prompt, one per harvest.

create table reports (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms on delete cascade,
  harvest_id uuid not null unique references harvests on delete cascade,
  period_start date not null,
  period_end date not null,
  snapshot jsonb not null,
  prompt_text text not null,
  generated_at timestamptz not null default now()
);
create index reports_farm_period_end on reports(farm_id, period_end desc);

alter table reports enable row level security;

create policy reports_owner on reports for all
  using (exists (select 1 from farms f where f.id = farm_id and f.user_id = auth.uid()))
  with check (exists (select 1 from farms f where f.id = farm_id and f.user_id = auth.uid()));
