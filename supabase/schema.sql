-- Run this in the Supabase SQL editor (Project > SQL Editor > New query).

create extension if not exists "uuid-ossp";

-- One row per user-symbol pair on someone's watchlist.
create table if not exists watchlists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  symbol text not null,
  notes text,
  added_at timestamptz not null default now(),
  unique (user_id, symbol)
);

alter table watchlists enable row level security;

create policy "Users manage their own watchlist"
  on watchlists for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Last-seen state per user per symbol. This is what powers "what changed
-- since you last checked": each visit diffs current cached data against
-- the most recent row here, then overwrites it.
create table if not exists snapshots (
  user_id uuid references auth.users(id) on delete cascade not null,
  symbol text not null,
  price numeric,
  volume bigint,
  score_components jsonb,
  as_of timestamptz,
  seen_at timestamptz not null default now(),
  primary key (user_id, symbol)
);

alter table snapshots enable row level security;

create policy "Users manage their own snapshots"
  on snapshots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Rolled-up price bars, written once per unique symbol by the shared cron
-- job (not per user) and read by everyone watching that symbol.
create table if not exists price_history (
  id bigserial primary key,
  symbol text not null,
  bucket_ts timestamptz not null default now(),
  close numeric,
  volume bigint
);

create index if not exists price_history_symbol_ts on price_history (symbol, bucket_ts desc);

alter table price_history enable row level security;

create policy "Anyone can read price history"
  on price_history for select
  using (true);

-- No write policy is defined for regular users on price_history, so RLS
-- denies inserts/updates/deletes by default. Only the cron job, using the
-- service role key (which bypasses RLS entirely), writes to this table.
