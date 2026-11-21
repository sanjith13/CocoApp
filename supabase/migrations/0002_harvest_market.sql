-- Harvests, market rates, harvest stats

-- Hardening from 0001 review: pin search_path
alter function public.set_updated_at() set search_path = public;

create table harvests (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms on delete cascade,
  harvest_date date not null,
  method text not null check (method in ('mudi', 'ton')),
  mudi_count numeric(8,1),
  extra_nuts int not null default 0,
  coconut_count int generated always as (
    case when method = 'mudi' then round(mudi_count * 200)::int + extra_nuts end
  ) stored,
  weight_ton numeric(8,3),
  sale_rate numeric(12,2),
  revenue numeric(14,2) generated always as (
    case when method = 'mudi' then (round(mudi_count * 200) + extra_nuts) * sale_rate
         else weight_ton * sale_rate end
  ) stored,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  check (
    (method = 'mudi' and mudi_count > 0 and weight_ton is null)
    or (method = 'ton' and weight_ton > 0 and mudi_count is null)
  ),
  unique (farm_id, harvest_date)
);

create trigger harvests_set_updated_at before update on harvests
  for each row execute function set_updated_at();

create table market_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  market_name text not null,
  date date not null,
  rate_type text not null check (rate_type in ('whole_nut_per_nut', 'dehusked_per_ton', 'copra_per_kg')),
  rate numeric(12,2) not null check (rate > 0),
  source text not null default 'manual' check (source in ('manual', 'harvest_form')),
  harvest_id uuid references harvests on delete set null,
  created_at timestamptz default now()
);

create index market_rates_user_type_date_idx on market_rates(user_id, rate_type, date desc);

-- RLS
alter table harvests enable row level security;
alter table market_rates enable row level security;

create policy harvests_owner on harvests for all
  using (exists (select 1 from farms f where f.id = farm_id and f.user_id = auth.uid()))
  with check (exists (select 1 from farms f where f.id = farm_id and f.user_id = auth.uid()));

create policy market_rates_owner on market_rates for all
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (harvest_id is null or exists (
      select 1 from harvests h join farms f on f.id = h.farm_id
      where h.id = harvest_id and f.user_id = auth.uid()))
  );

-- Harvest stats
create view harvest_stats with (security_invoker = true) as
with base as (
  select h.*,
    case when h.method = 'mudi' then h.coconut_count::numeric else h.weight_ton end as quantity,
    case when h.method = 'mudi' then 'nuts' else 'ton' end as unit,
    tree_count_on(h.farm_id, h.harvest_date) as trees
  from harvests h
),
lagged as (
  select b.*,
    lag(b.quantity) over (partition by b.farm_id, b.method order by b.harvest_date)
      as prev_same_method_quantity,
    lag(b.harvest_date) over (partition by b.farm_id order by b.harvest_date)
      as prev_any_date
  from base b
)
select l.*,
  case when l.trees is null or l.trees = 0 then null else l.quantity / l.trees end as per_tree,
  case when l.prev_same_method_quantity is null or l.prev_same_method_quantity = 0 then null
       else round((l.quantity - l.prev_same_method_quantity) / l.prev_same_method_quantity * 100, 2)
  end as change_pct,
  coalesce(l.prev_any_date, l.harvest_date - 45) as period_start
from lagged l;

-- Latest rate per user, market and rate type
create view latest_rates with (security_invoker = true) as
select distinct on (user_id, market_name, rate_type) *
from market_rates
order by user_id, market_name, rate_type, date desc, created_at desc;

-- Estimated revenue for an unsold harvest, using the owner's latest matching rate (any market)
create function estimated_revenue(p_harvest uuid) returns numeric
language sql stable
set search_path = public
as $$
  select h.quantity * r.rate
  from (
    select hv.id, f.user_id, hv.sale_rate,
      case when hv.method = 'mudi' then hv.coconut_count::numeric else hv.weight_ton end as quantity,
      case when hv.method = 'mudi' then 'whole_nut_per_nut' else 'dehusked_per_ton' end as rate_type
    from harvests hv join farms f on f.id = hv.farm_id
    where hv.id = p_harvest
  ) h
  join lateral (
    select m.rate from market_rates m
    where m.user_id = h.user_id and m.rate_type = h.rate_type
    order by m.date desc, m.created_at desc
    limit 1
  ) r on true
  where h.sale_rate is null
$$;
