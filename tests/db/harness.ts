import { PGlite, type Transaction } from '@electric-sql/pglite'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations')

const BOOTSTRAP_SQL = `
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
`

const GRANTS_SQL = `
grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
`

export type TestDb = {
  db: PGlite
  asUser<T>(userId: string, fn: (tx: Transaction) => Promise<T>): Promise<T>
  asService<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>
  createUser(): Promise<string>
  close(): Promise<void>
}

function migrationFiles(): string[] {
  if (!existsSync(MIGRATIONS_DIR)) return []
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
}

export async function createTestDb(): Promise<TestDb> {
  const db = new PGlite()
  await db.exec(BOOTSTRAP_SQL)
  for (const file of migrationFiles()) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'))
  }
  await db.exec(GRANTS_SQL)

  return {
    db,
    asUser: (userId, fn) =>
      db.transaction(async (tx) => {
        await tx.query('set local role authenticated')
        await tx.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ sub: userId, role: 'authenticated' }),
        ])
        return fn(tx)
      }),
    asService: (fn) => db.transaction((tx) => fn(tx)),
    close: () => db.close(),
    async createUser() {
      const r = await db.query<{ id: string }>(
        'insert into auth.users(id) values (gen_random_uuid()) returning id',
      )
      return r.rows[0].id
    },
  }
}
