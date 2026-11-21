-- Dashboard analytics views and KPI function.
-- Nut-based (mudi) and ton-based production are never combined: every view groups by method.

create view production_monthly with (security_invoker = true) as
select farm_id, method,
  date_trunc('month', harvest_date)::date as month,
  sum(case when method = 'mudi' then coconut_count::numeric else weight_ton end) as quantity,
  sum(revenue) as revenue
from harvests
group by farm_id, method, date_trunc('month', harvest_date);

create view production_yearly with (security_invoker = true) as
select farm_id, method,
  extract(year from harvest_date)::int as year,
  sum(case when method = 'mudi' then coconut_count::numeric else weight_ton end) as quantity,
  sum(revenue) as revenue
from harvests
group by farm_id, method, extract(year from harvest_date);

-- Average monthly total per calendar month; years = distinct years that had harvests in it.
create view production_seasonal with (security_invoker = true) as
select farm_id, method, cal_month,
  avg(quantity) as avg_quantity,
  count(*)::int as years
from (
  select farm_id, method, extract(month from month)::int as cal_month, quantity
  from production_monthly
) m
group by farm_id, method, cal_month;

create view market_weekly with (security_invoker = true) as
select user_id, market_name, rate_type,
  date_trunc('week', date)::date as week,
  avg(rate) as avg_rate
from market_rates
group by user_id, market_name, rate_type, date_trunc('week', date);

create view market_monthly with (security_invoker = true) as
select user_id, market_name, rate_type,
  date_trunc('month', date)::date as month,
  avg(rate) as avg_rate
from market_rates
group by user_id, market_name, rate_type, date_trunc('month', date);

create view npk_monthly with (security_invoker = true) as
select farm_id,
  date_trunc('month', date)::date as month,
  sum(n_kg) as n_kg, sum(p_kg) as p_kg, sum(k_kg) as k_kg
from fertilizer_npk
group by farm_id, date_trunc('month', date);

-- One row of headline numbers. p_farm null = all of the caller's active farms.
-- month_avg_temp: current IST month to date. month_class: class of the latest COMPLETED month
-- (month_class_month) - a partial month is never classified against a full-month normal.
create function dashboard_kpis(p_farm uuid default null)
returns table (
  total_farms int, total_trees int,
  last_harvest_qty numeric, last_harvest_unit text, last_change_pct numeric,
  month_avg_temp numeric, month_class text,
  rate_whole_nut numeric, rate_dehusked numeric, rate_copra numeric,
  revenue_ytd numeric,
  month_class_month date
)
language sql stable
set search_path = public
as $$
  with today as (
    select (now() at time zone 'Asia/Kolkata')::date as d
  ),
  fs as (
    select f.id from farms f
    where f.active and (p_farm is null or f.id = p_farm)
  ),
  lh as (
    select s.quantity, s.unit, s.change_pct
    from harvest_stats s join fs on fs.id = s.farm_id
    order by s.harvest_date desc, s.created_at desc
    limit 1
  ),
  temp as (
    select avg(w.temp_mean) as t
    from weather_daily w join fs on fs.id = w.farm_id, today
    where w.date >= date_trunc('month', today.d)::date and w.date <= today.d
  ),
  cm as (
    select max(m.month) as month
    from weather_monthly m join fs on fs.id = m.farm_id, today
    where m.month < date_trunc('month', today.d)::date and m.climate_class is not null
  ),
  cls as (
    select m.climate_class, cm.month
    from weather_monthly m join fs on fs.id = m.farm_id join cm on cm.month = m.month
    where m.climate_class is not null
    group by m.climate_class, cm.month
    order by count(*) desc, m.climate_class
    limit 1
  ),
  rates as (
    select distinct on (r.rate_type) r.rate_type, r.rate
    from market_rates r
    order by r.rate_type, r.date desc, r.created_at desc
  ),
  rev as (
    select coalesce(sum(h.revenue), 0) as total
    from harvests h join fs on fs.id = h.farm_id, today
    where h.sale_rate is not null
      and extract(year from h.harvest_date) = extract(year from today.d)
  )
  select
    (select count(*)::int from fs),
    (select coalesce(sum(tree_count_on(fs.id, today.d)), 0)::int from fs, today),
    (select quantity from lh),
    (select unit from lh),
    (select change_pct from lh),
    (select t from temp),
    (select climate_class from cls),
    (select rate from rates where rate_type = 'whole_nut_per_nut'),
    (select rate from rates where rate_type = 'dehusked_per_ton'),
    (select rate from rates where rate_type = 'copra_per_kg'),
    (select total from rev),
    (select month from cls)
$$;
