-- Farm expenses, for profit per period (sold-harvest revenue minus expenses).

create table expenses (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references farms on delete cascade,
  date date not null,
  category text not null check (category in ('labour', 'fertilizer', 'pesticide', 'irrigation', 'transport', 'equipment', 'other')),
  amount numeric(12,2) not null check (amount > 0),
  notes text,
  created_at timestamptz not null default now()
);
create index expenses_farm_date on expenses(farm_id, date desc);

alter table expenses enable row level security;

create policy expenses_owner on expenses for all
  using (exists (select 1 from farms f where f.id = farm_id and f.user_id = (select auth.uid())))
  with check (exists (select 1 from farms f where f.id = farm_id and f.user_id = (select auth.uid())));

grant select, insert, update, delete on expenses to authenticated, service_role;
