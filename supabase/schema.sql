-- Watchlist persistence schema and RLS
-- Table: public.watchlist_rows
create table if not exists public.watchlist_rows (
  id uuid primary key,
  user_id uuid not null,
  symbol text not null default '',
  strike text not null default '',
  expiry text not null default '', -- YYYY-MM-DD string for simplicity
  tradingsymbol text,
  instrument_token bigint,
  position int,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.watchlist_rows enable row level security;

-- Policies
drop policy if exists "watchlist_select_own" on public.watchlist_rows;
create policy "watchlist_select_own" on public.watchlist_rows
  for select using (auth.uid() = user_id);

drop policy if exists "watchlist_insert_own" on public.watchlist_rows;
create policy "watchlist_insert_own" on public.watchlist_rows
  for insert with check (auth.uid() = user_id);

drop policy if exists "watchlist_update_own" on public.watchlist_rows;
create policy "watchlist_update_own" on public.watchlist_rows
  for update using (auth.uid() = user_id);

drop policy if exists "watchlist_delete_own" on public.watchlist_rows;
create policy "watchlist_delete_own" on public.watchlist_rows
  for delete using (auth.uid() = user_id);

-- Trigger to maintain updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_watchlist_rows_updated_at on public.watchlist_rows;
create trigger set_watchlist_rows_updated_at
before update on public.watchlist_rows
for each row execute function public.set_updated_at();
