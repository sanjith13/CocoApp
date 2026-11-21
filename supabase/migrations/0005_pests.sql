-- Pest incidents and monthly roll-up

create table pest_incidents (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms on delete cascade,
  date date not null,
  pest_name text not null check (length(btrim(pest_name)) > 0),
  severity text not null check (severity in ('low', 'medium', 'high')),
  remarks text,
  created_at timestamptz not null default now()
);
create index pest_incidents_farm_date on pest_incidents(farm_id, date);

alter table pest_incidents enable row level security;

create policy pest_incidents_owner on pest_incidents for all
  using (exists (select 1 from farms f where f.id = farm_id and f.user_id = auth.uid()))
  with check (exists (select 1 from farms f where f.id = farm_id and f.user_id = auth.uid()));

create view pest_monthly with (security_invoker = true) as
select farm_id,
  date_trunc('month', date)::date as month,
  count(*)::int as incidents,
  (count(*) filter (where severity = 'high'))::int as high,
  (count(*) filter (where severity = 'medium'))::int as medium,
  (count(*) filter (where severity = 'low'))::int as low
from pest_incidents
group by farm_id, date_trunc('month', date);
