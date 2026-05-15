# Game Hub

A small web app where users sign in with email + password (accounts created manually in Supabase) and play self-contained games.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. In **Authentication → Providers → Email**, turn **off** "Enable email signups"
3. Create users manually in **Authentication → Users** (add user, set email + password)
4. Run the migration to create the `profiles` table:

   - In Supabase Dashboard: **SQL Editor** → New query
   - Paste contents of `supabase/migrations/20240222000000_create_profiles.sql`
   - Run

### 3. Environment variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with a user you created in Supabase.

## First-time setup for a new user

After creating a user in Supabase, they log in at `/login`. On first visit, they’ll be prompted to set a username on the Profile page. Once set, they can access the hub and games.

## Games

- **Find the Animal!** – Spot the correct animal from 3 choices across 6 rounds
- **Bubble Pop!** – Tap floating bubbles before they drift away (30-second sprint)
- **Animal Memory Match** – Flip cards to find all matching pairs
- **Number Guessing** – Guess a number between 1 and 100 with higher/lower hints
- **Animal Match** – Drag to connect matching animal pairs side by side
- **Shape Sorter** – Drag each shape into the right bin (circle, square, triangle, star)

## Tech stack

- **Next.js** (App Router), **TypeScript**, **Tailwind CSS**
- **Supabase** for auth and profiles (manual user creation only; no self-service signup)
- Games are self-contained modules under `src/games/`

## Project structure

- `src/app/(auth)/login` – Login page (email + password)
- `src/app/(protected)/hub` – Game selection index
- `src/app/(protected)/profile` – Username and profile
- `src/app/(protected)/games/*` – Individual game pages
- `src/components/ui/` – Shared UI primitives (Button, Card, Input, Modal)
- `src/games/` – Game modules (registry + find-animal, bubble-pop, farm-match, number-guess, animal-match, shape-sorter)
- `supabase/migrations/` – SQL for `profiles` table and RLS

See `PLAN.md` for the full design and roadmap.

## Adding new tables (post Oct 30, 2026)

Starting **Oct 30, 2026**, Supabase no longer auto-grants Data API access to new tables in the `public` schema. Any new table must include explicit `GRANT` statements or `supabase-js` will get a `42501` error.

Use this template for every new migration that creates a table:

```sql
create table public.your_table (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- ... your columns ...
  created_at timestamptz not null default now()
);

-- Required: grant Data API access per role
grant select
  on public.your_table
  to anon;

grant select, insert, update, delete
  on public.your_table
  to authenticated;

grant select, insert, update, delete
  on public.your_table
  to service_role;

-- Enable RLS
alter table public.your_table
  enable row level security;

-- Add policies (example: users can only see their own rows)
create policy "users can read their own rows"
  on public.your_table
  for select to authenticated
  using (auth.uid() = user_id);

create policy "users can insert their own rows"
  on public.your_table
  for insert to authenticated
  with check (auth.uid() = user_id);
```

Adjust the `anon` grants if the table should be readable without login (most game tables here require auth, so `anon` typically gets nothing or just `select`).
