-- The Game of Life: 2-4 player multiplayer, single-row game state.
-- Player state lives in the `players` jsonb array so the whole game is one
-- realtime subscription, matching the checkers/connect4/tic-tac-toe pattern.

create table if not exists public.life_games (
  id uuid primary key default gen_random_uuid(),
  host uuid references auth.users not null,
  players jsonb not null default '[]'::jsonb,
  current_turn smallint not null default 0,
  spin smallint,
  pending jsonb,
  log jsonb not null default '[]'::jsonb,
  status text not null default 'waiting',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reuses public.set_updated_at() created by the checkers migration.
drop trigger if exists set_life_games_updated_at on public.life_games;
create trigger set_life_games_updated_at
  before update on public.life_games
  for each row execute function public.set_updated_at();

-- Is `uid` seated in this game?
create or replace function public.life_is_member(p jsonb, uid uuid)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from jsonb_array_elements(coalesce(p, '[]'::jsonb)) e
    where (e->>'user_id')::uuid = uid
  );
$$;

alter table public.life_games enable row level security;

drop policy if exists "players can read their games" on public.life_games;
create policy "players can read their games" on public.life_games
  for select using (
    auth.uid() = host
    or status = 'waiting'
    or public.life_is_member(players, auth.uid())
  );

drop policy if exists "authenticated users can create games" on public.life_games;
create policy "authenticated users can create games" on public.life_games
  for insert with check (auth.uid() = host);

drop policy if exists "players can update their games" on public.life_games;
create policy "players can update their games" on public.life_games
  for update using (
    auth.uid() = host or public.life_is_member(players, auth.uid())
  );

-- Seat the caller. Runs server-side under a row lock so two people tapping
-- Join at the same moment cannot be handed the same seat.
create or replace function public.life_join_game(room uuid)
returns setof public.life_games
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.life_games;
  n int;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into g from public.life_games where id = room for update;
  if not found then
    raise exception 'no such game';
  end if;

  -- Already seated, game not open, or full: hand back the row unchanged.
  if g.status <> 'waiting'
     or public.life_is_member(g.players, uid)
     or jsonb_array_length(g.players) >= 4 then
    return next g;
    return;
  end if;

  n := jsonb_array_length(g.players);

  -- NULLs are cast so jsonb_build_object can resolve their type.
  update public.life_games
  set players = g.players || jsonb_build_object(
        'user_id', uid,
        'seat', n,
        'path', null::text,
        'pos', 0,
        'money', 10000,
        'career', null::text,
        'house', null::text,
        'spouse', false,
        'kids', 0,
        'retired', false
      )
  where id = room
  returning * into g;

  return next g;
end;
$$;

-- Host-only: flip waiting -> active and queue seat 0's path choice.
create or replace function public.life_start_game(room uuid)
returns setof public.life_games
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.life_games;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into g from public.life_games where id = room for update;
  if not found then
    raise exception 'no such game';
  end if;
  if g.host <> uid then
    raise exception 'only the host can start the game';
  end if;
  if g.status <> 'waiting' then
    return next g;
    return;
  end if;
  if jsonb_array_length(g.players) < 2 then
    raise exception 'need at least 2 players';
  end if;

  update public.life_games
  set status = 'active',
      current_turn = 0,
      pending = jsonb_build_object(
        'seat', 0,
        'kind', 'choosePath',
        'options', jsonb_build_array('career', 'college')
      )
  where id = room
  returning * into g;

  return next g;
end;
$$;

-- `revoke ... from public` does NOT remove Supabase's explicit grant to `anon`,
-- so revoke that role by name too. Both functions also reject a null auth.uid().
revoke all on function public.life_join_game(uuid) from public;
revoke all on function public.life_start_game(uuid) from public;
revoke execute on function public.life_join_game(uuid) from anon;
revoke execute on function public.life_start_game(uuid) from anon;
grant execute on function public.life_join_game(uuid) to authenticated;
grant execute on function public.life_start_game(uuid) to authenticated;

-- Idempotent: re-running the migration must not fail on an existing publication entry.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'life_games'
  ) then
    alter publication supabase_realtime add table public.life_games;
  end if;
end
$$;
