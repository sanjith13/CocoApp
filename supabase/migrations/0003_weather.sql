-- Weather: daily observations, 10-year climate normals, monthly classification

create table weather_daily (
  farm_id uuid not null references farms on delete cascade,
  date date not null,
  temp_min numeric(5,2),
  temp_max numeric(5,2),
  temp_mean numeric(5,2),
  humidity_mean numeric(5,2),
  rainfall_mm numeric(7,2),
  windspeed_max numeric(6,2),
  weather_code int,
  weather_type text check (weather_type in ('Sunny', 'Cloudy', 'Rainy', 'Storm')),
  primary key (farm_id, date)
);

create table farm_climate_normals (
  farm_id uuid not null references farms on delete cascade,
  month smallint not null check (month between 1 and 12),
  mean_rainfall_mm numeric(8,2) not null,
  primary key (farm_id, month)
);

-- RLS: owners read via their farm; writes only via service role (bypasses RLS)
alter table weather_daily enable row level security;
alter table farm_climate_normals enable row level security;

create policy weather_daily_select on weather_daily for select
  using (exists (select 1 from farms f where f.id = farm_id and f.user_id = (select auth.uid())));

create policy farm_climate_normals_select on farm_climate_normals for select
  using (exists (select 1 from farms f where f.id = farm_id and f.user_id = (select auth.uid())));

-- Monthly roll-up with classification.
-- dry: rain < 60% of the 10-year same-month mean; wet: > 140%; else normal; null without a normal.
-- heatwave: >= 3 consecutive calendar days with temp_max >= 38 (gaps-and-islands), attributed
-- to every month the island touches. heavy_rain: any day >= 64.5 mm.
create view weather_monthly with (security_invoker = true) as
with hot as (
  select farm_id, date,
    date - (row_number() over (partition by farm_id order by date))::int as grp
  from weather_daily
  where temp_max >= 38
),
islands as (
  select farm_id, grp from hot group by farm_id, grp having count(*) >= 3
),
heat_months as (
  select distinct h.farm_id, date_trunc('month', h.date)::date as month
  from hot h join islands i on i.farm_id = h.farm_id and i.grp = h.grp
),
agg as (
  select farm_id,
    date_trunc('month', date)::date as month,
    avg(temp_mean) as avg_temp,
    sum(rainfall_mm) as total_rain,
    avg(humidity_mean) as avg_humidity,
    coalesce(bool_or(rainfall_mm >= 64.5), false) as heavy_rain
  from weather_daily
  group by farm_id, date_trunc('month', date)
)
select a.farm_id, a.month, a.avg_temp, a.total_rain, a.avg_humidity,
  case
    when n.mean_rainfall_mm is null or n.mean_rainfall_mm = 0 then null
    when coalesce(a.total_rain, 0) < 0.6 * n.mean_rainfall_mm then 'dry'
    when coalesce(a.total_rain, 0) > 1.4 * n.mean_rainfall_mm then 'wet'
    else 'normal'
  end as climate_class,
  (hm.month is not null) as heatwave,
  a.heavy_rain
from agg a
left join farm_climate_normals n
  on n.farm_id = a.farm_id and n.month = extract(month from a.month)
left join heat_months hm on hm.farm_id = a.farm_id and hm.month = a.month;

-- Weather over a harvest period (period_start, harvest_date]
create function harvest_weather(p_harvest uuid)
returns table (
  avg_temp numeric, total_rain numeric, avg_humidity numeric,
  days_with_data int, days_in_period int, heatwave boolean, heavy_rain boolean
)
language sql stable
set search_path = public
as $$
  with hs as (
    select farm_id, period_start, harvest_date from harvest_stats where id = p_harvest
  ),
  w as (
    select wd.* from weather_daily wd join hs on wd.farm_id = hs.farm_id
    where wd.date > hs.period_start and wd.date <= hs.harvest_date
  ),
  hot as (
    select date, date - (row_number() over (order by date))::int as grp from w where temp_max >= 38
  ),
  wave as (
    select exists (select 1 from hot group by grp having count(*) >= 3) as heatwave
  )
  select
    (select avg(temp_mean) from w),
    (select sum(rainfall_mm) from w),
    (select avg(humidity_mean) from w),
    (select count(*)::int from w),
    (select (harvest_date - period_start)::int from hs),
    (select heatwave from wave),
    coalesce((select bool_or(rainfall_mm >= 64.5) from w), false)
  from hs
$$;
