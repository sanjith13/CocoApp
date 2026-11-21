-- Explicit grants so the push does not depend on the project's "expose new tables" default.
-- RLS still restricts rows (anon only sees seed fertilizers).
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;
