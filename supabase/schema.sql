-- ============================================================
-- Cauldron — Supabase schema
--
-- Run this once in your Supabase project:
--   Dashboard -> SQL Editor -> New query -> paste -> Run
--
-- One generic table holds every kind of record. That keeps sync
-- simple (one endpoint, one merge rule) and means adding a new
-- kind of data later needs no migration.
-- ============================================================

create table if not exists public.records (
  user_id     uuid        not null references auth.users (id) on delete cascade,

  -- 'meal' | 'shot' | 'activity' | 'weight' | 'favorite'
  -- | 'water' | 'theme' | 'settings'
  kind        text        not null,

  -- the app's own id for the record (a date for water, 'singleton' for settings)
  id          text        not null,

  data        jsonb,

  -- a delete is a row with deleted = true, so other devices learn about it
  deleted     boolean     not null default false,

  -- the CLIENT's clock. Used to decide which of two edits wins.
  updated_at  timestamptz not null default now(),

  -- the SERVER's clock, maintained by the trigger below. Used as the
  -- pull cursor, so a device with a skewed clock can't hide its writes.
  synced_at   timestamptz not null default now(),

  primary key (user_id, kind, id)
);

-- Keep synced_at honest: it is always the server's time of write.
create or replace function public.records_touch_synced_at()
returns trigger
language plpgsql
as $$
begin
  new.synced_at = now();
  return new;
end;
$$;

drop trigger if exists records_synced_at on public.records;
create trigger records_synced_at
  before insert or update on public.records
  for each row execute function public.records_touch_synced_at();

-- Paging by the cursor, scoped to one user.
create index if not exists records_user_synced_idx
  on public.records (user_id, synced_at);

-- ------------------------------------------------------------
-- Row level security: a signed-in user can only ever see and
-- write their own rows. This is what makes it safe to ship the
-- anon key in a public web app.
-- ------------------------------------------------------------
alter table public.records enable row level security;

drop policy if exists "records are private to their owner" on public.records;
create policy "records are private to their owner"
  on public.records
  for all
  to authenticated
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Anonymous visitors get nothing at all.
revoke all on public.records from anon;
grant select, insert, update, delete on public.records to authenticated;
