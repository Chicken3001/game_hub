-- Create checkers_games table
create table if not exists public.checkers_games (
  id uuid primary key default gen_random_uuid(),
  player_1 uuid references auth.users not null,
  player_2 uuid references auth.users,
  board jsonb not null default '[0,2,0,2,0,2,0,2,2,0,2,0,2,0,2,0,0,2,0,2,0,2,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,1,0,0,1,0,1,0,1,0,1,1,0,1,0,1,0,1,0]'::jsonb,
  current_turn smallint not null default 1,
  status text not null default 'waiting',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_checkers_games_updated_at on public.checkers_games;
create trigger set_checkers_games_updated_at
  before update on public.checkers_games
  for each row execute function public.set_updated_at();

-- Enable RLS
alter table public.checkers_games enable row level security;

-- Players can read games they are in (or waiting games)
create policy "players can read their games" on public.checkers_games
  for select using (
    auth.uid() = player_1
    or auth.uid() = player_2
    or status = 'waiting'
  );

-- Anyone authenticated can insert a game as player_1
create policy "authenticated users can create games" on public.checkers_games
  for insert with check (auth.uid() = player_1);

-- Players can update games they are in
create policy "players can update their games" on public.checkers_games
  for update using (
    auth.uid() = player_1 or auth.uid() = player_2
  );

-- Enable realtime
alter publication supabase_realtime add table public.checkers_games;
