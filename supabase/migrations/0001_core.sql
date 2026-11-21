-- Core schema: farms, tree-count history, varieties

create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table farms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  location_text text,
  latitude numeric(8,5) not null,
  longitude numeric(8,5) not null,
  acreage numeric(8,2) not null check (acreage >= 0),
  soil_type text,
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger farms_set_updated_at before update on farms
  for each row execute function set_updated_at();

create table farm_tree_counts (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms on delete cascade,
  effective_date date not null,
  tree_count int not null check (tree_count >= 0),
  unique (farm_id, effective_date)
);

create table farm_varieties (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms on delete cascade,
  variety_name text not null,
  tree_count int not null check (tree_count >= 0)
);

create index farm_varieties_farm_id_idx on farm_varieties(farm_id);
create index farms_user_id_idx on farms(user_id);

-- Tree count in force on a date; falls back to the earliest row for backdated dates.
create function tree_count_on(p_farm uuid, p_date date) returns int
language sql stable as $$
  select coalesce(
    (select tree_count from farm_tree_counts
      where farm_id = p_farm and effective_date <= p_date
      order by effective_date desc limit 1),
    (select tree_count from farm_tree_counts
      where farm_id = p_farm
      order by effective_date asc limit 1)
  )
$$;

create function current_tree_count(p_farm uuid) returns int
language sql stable as $$
  select tree_count_on(p_farm, current_date)
$$;

create view farms_with_trees with (security_invoker = true) as
  select f.*, current_tree_count(f.id) as current_tree_count
  from farms f;

-- RLS
alter table farms enable row level security;
alter table farm_tree_counts enable row level security;
alter table farm_varieties enable row level security;

create policy farms_owner on farms for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy farm_tree_counts_owner on farm_tree_counts for all
  using (exists (select 1 from farms f where f.id = farm_id and f.user_id = auth.uid()))
  with check (exists (select 1 from farms f where f.id = farm_id and f.user_id = auth.uid()));

create policy farm_varieties_owner on farm_varieties for all
  using (exists (select 1 from farms f where f.id = farm_id and f.user_id = auth.uid()))
  with check (exists (select 1 from farms f where f.id = farm_id and f.user_id = auth.uid()));
