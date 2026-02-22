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

- **Farm Animal Match** – Match pairs of farm animal emojis
- **Number Guessing** – Guess a number between 1 and 100

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
- `src/games/` – Game modules (registry + farm-match, number-guess)
- `supabase/migrations/` – SQL for `profiles` table and RLS

See `PLAN.md` for the full design and roadmap.
