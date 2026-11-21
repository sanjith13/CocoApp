-- Fertilizer master list, applications, NPK view and before/after analysis

create table fertilizer_master (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade default auth.uid(),
  name text not null,
  n_pct numeric(5,2) not null default 0 check (n_pct between 0 and 100),
  p_pct numeric(5,2) not null default 0 check (p_pct between 0 and 100),
  k_pct numeric(5,2) not null default 0 check (k_pct between 0 and 100),
  created_at timestamptz not null default now()
);

-- Seed rows have user_id null: readable by everyone, writable by nobody.
insert into fertilizer_master(user_id, name, n_pct, p_pct, k_pct) values
  (null, 'Urea', 46, 0, 0),
  (null, 'DAP', 18, 46, 0),
  (null, 'MOP', 0, 0, 60),
  (null, 'SSP', 0, 16, 0),
  (null, '17-17-17', 17, 17, 17);

create table fertilizer_applications (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms on delete cascade,
  date date not null,
  fertilizer_id uuid not null references fertilizer_master,
  quantity_kg numeric(10,2) not null check (quantity_kg > 0),
  notes text,
  created_at timestamptz not null default now()
);
create index fertilizer_applications_farm_date on fertilizer_applications(farm_id, date);

alter table fertilizer_master enable row level security;
alter table fertilizer_applications enable row level security;

create policy fertilizer_master_select on fertilizer_master for select
  using (user_id is null or user_id = auth.uid());
create policy fertilizer_master_insert on fertilizer_master for insert
  with check (user_id = auth.uid());
create policy fertilizer_master_update on fertilizer_master for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy fertilizer_master_delete on fertilizer_master for delete
  using (user_id = auth.uid());

create policy fertilizer_applications_owner on fertilizer_applications for all
  using (exists (select 1 from farms f where f.id = farm_id and f.user_id = auth.uid()))
  with check (
    exists (select 1 from farms f where f.id = farm_id and f.user_id = auth.uid())
    -- the FK check bypasses RLS, so require the fertilizer to be visible to the caller
    and exists (select 1 from fertilizer_master m where m.id = fertilizer_id)
  );

-- Application with nutrient totals; per-tree uses the tree count on the application date.
create view fertilizer_npk with (security_invoker = true) as
with x as (
  select a.id, a.farm_id, a.date, a.fertilizer_id, m.name as fertilizer_name, a.quantity_kg, a.notes,
    a.quantity_kg * m.n_pct / 100 as n_kg,
    a.quantity_kg * m.p_pct / 100 as p_kg,
    a.quantity_kg * m.k_pct / 100 as k_kg,
    tree_count_on(a.farm_id, a.date) as trees,
    f.acreage
  from fertilizer_applications a
  join fertilizer_master m on m.id = a.fertilizer_id
  join farms f on f.id = a.farm_id
)
select id, farm_id, date, fertilizer_id, fertilizer_name, quantity_kg, notes, n_kg, p_kg, k_kg, trees,
  case when trees is null or trees = 0 then null else n_kg / trees end as n_per_tree_kg,
  case when trees is null or trees = 0 then null else p_kg / trees end as p_per_tree_kg,
  case when trees is null or trees = 0 then null else k_kg / trees end as k_per_tree_kg,
  case when acreage is null or acreage = 0 then null else n_kg / acreage end as n_per_acre_kg,
  case when acreage is null or acreage = 0 then null else p_kg / acreage end as p_per_acre_kg,
  case when acreage is null or acreage = 0 then null else k_kg / acreage end as k_per_acre_kg
from x;

-- Before/after yield per tree around an application, per harvest method.
-- Baseline: 90 days before; windows by calendar months after: [0,1) [1,2) [2,3) [3,6).
create function fertilizer_effect(p_application uuid)
returns table (
  method text, window_label text, from_month int, to_month int,
  harvests int, avg_per_tree numeric, change_pct numeric
)
language sql stable
set search_path = public
as $$
  with app as (
    select farm_id, date as d from fertilizer_applications where id = p_application
  ),
  hs as (
    select s.method, s.harvest_date, s.per_tree
    from harvest_stats s join app on s.farm_id = app.farm_id
  ),
  methods as (
    select distinct method from hs
  ),
  windows(label, from_m, to_m, ord) as (
    values ('0-1', 0, 1, 1), ('1-2', 1, 2, 2), ('2-3', 2, 3, 3), ('3-6', 3, 6, 4)
  ),
  slots as (
    select m.method, 'baseline'::text as label, null::int as from_m, null::int as to_m, 0 as ord,
      (app.d - 90) as lo, app.d as hi
    from methods m cross join app
    union all
    select m.method, w.label, w.from_m, w.to_m, w.ord,
      (app.d + make_interval(months => w.from_m))::date,
      (app.d + make_interval(months => w.to_m))::date
    from methods m cross join windows w cross join app
  ),
  agg as (
    select sl.method, sl.label, sl.from_m, sl.to_m, sl.ord,
      count(hs.per_tree)::int as harvests,
      avg(hs.per_tree) as avg_pt
    from slots sl
    left join hs on hs.method = sl.method and hs.harvest_date >= sl.lo and hs.harvest_date < sl.hi
    group by sl.method, sl.label, sl.from_m, sl.to_m, sl.ord
  )
  select a.method, a.label, a.from_m, a.to_m, a.harvests, a.avg_pt,
    case
      when a.label = 'baseline' or b.avg_pt is null or b.avg_pt = 0 or a.avg_pt is null then null
      else round((a.avg_pt - b.avg_pt) / b.avg_pt * 100, 2)
    end
  from agg a
  left join agg b on b.method = a.method and b.label = 'baseline'
  order by a.method, a.ord
$$;
