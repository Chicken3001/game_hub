# Game Hub – Project Plan

## Overview

A small web app (~10 users) where you manually create user accounts in Supabase. Those users log in with email + password, see a hub of games, and each game is self-contained. Profiles hold a username; score tracking and leaderboards are planned for later but not built now.

---

## 1. Tech Stack

| Layer | Choice |
|-------|--------|
| **Framework** | Next.js (App Router) |
| **Auth** | Supabase Auth (email + password, no self-service signup) |
| **Styling** | Tailwind CSS |
| **Language** | TypeScript |

---

## 2. Auth Model

- **No magic link.** Login is **email + password** only.
- **No registration.** You create every user manually in the Supabase Dashboard (or via API).
- **Supabase settings:** Authentication → Providers → Email → **Enable email signups: OFF.**  
  Only users you create (or invite) can exist.
- **Flow:** You create a user and set an initial password (or use “Invite user” so they set it once via email). They use that to sign in at `/login`.

Scale: under 10 people; no need for invite flows or admin UI unless you want them later.

---

## 3. Profiles & Data Model

### Profiles (build now)

- **Table:** `profiles` (or use Supabase’s built-in pattern: `public.profiles` synced from `auth.users`).
- **Fields:**  
  - `id` (uuid, PK, matches `auth.users.id`)  
  - `username` (text, unique, required)  
  - `created_at` / `updated_at` if desired  
- **Creation:** On first login (or via trigger when user is created), ensure a row in `profiles` and prompt for `username` if missing.

### Score tracking / leaderboards (later)

- **Design allowance only:** Don’t build now, but avoid doing things that would block it:
  - Keep game results easy to represent (e.g. “game_id + score + user_id + timestamp”).
  - Shared UI primitives and a consistent way to show “score” or “result” in games will make adding leaderboards easier later.

---

## 4. Project Structure

```
game_hub/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Redirect to /hub or /login
│   │   ├── (auth)/
│   │   │   └── login/page.tsx           # Email + password form
│   │   ├── (protected)/
│   │   │   ├── layout.tsx               # Auth guard + profile check
│   │   │   ├── hub/page.tsx             # Index – game selection
│   │   │   ├── profile/page.tsx         # Set/view username (if needed)
│   │   │   └── games/
│   │   │       ├── farm-match/page.tsx
│   │   │       └── number-guess/page.tsx
│   │   └── api/
│   ├── components/
│   │   ├── ui/                          # Shared UI primitives
│   │   │   # e.g. Button, Card, Input, Modal, layout primitives
│   │   └── GameCard.tsx                 # Hub game card
│   ├── games/
│   │   ├── farm-match/
│   │   │   ├── FarmMatchGame.tsx
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── number-guess/
│   │   │   ├── NumberGuessGame.tsx
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── registry.ts                  # List of games (id, name, path, description)
│   ├── lib/
│   │   └── supabase/
│   │       ├── client.ts
│   │       └── server.ts
│   └── types/
├── supabase/
│   └── migrations/                      # profiles, RLS, etc.
├── .env.local
├── package.json
├── PLAN.md
└── README.md
```

---

## 5. Shared UI Primitives

- Central place for reusable components used by the hub and all games.
- **Suggested:** `Button`, `Card`, `Input`, `Modal` (or `Dialog`), and simple layout/wrapper components. Games and the hub use these so adding leaderboards later is just new screens using the same primitives.

---

## 6. Auth Flow (Summary)

1. **Unauthenticated** → redirect to `/login`.
2. **Login** → email + password form → `supabase.auth.signInWithPassword()`.
3. **Success** → redirect to `/hub`. Optionally ensure profile exists and has `username`; if not, redirect to `/profile` to set it.
4. **Protected layout** → middleware or layout checks session; no session → `/login`.
5. **Logout** → `signOut()`, redirect to `/login`.

---

## 7. Hub & Games

- **Hub:** Index page with a grid of `GameCard`s; each links to a game route. Data from `games/registry.ts`.
- **Games:** Self-contained (e.g. farm animal matching, number guessing). Use shared UI primitives. No score persistence or leaderboards for now; design so we can add “submit score” and leaderboard views later without redoing the games.

---

## 8. Implementation Phases

| Phase | Tasks |
|-------|--------|
| **1. Scaffold** | Next.js, Tailwind, TypeScript, Supabase client |
| **2. Auth** | Login (email + password), protected layout, middleware |
| **3. Profiles** | `profiles` table, RLS, ensure profile + username on first use, profile page if needed |
| **4. Shared UI** | Primitive components (Button, Card, Input, Modal, etc.) |
| **5. Hub** | Index page, GameCard, game registry |
| **6. Games** | Farm Match, Number Guess (self-contained, using primitives) |
| **7. Polish** | Loading/error states, basic responsive layout |

**Later (not in scope now):** Score storage, leaderboards.

---

## 9. Supabase Checklist

- [ ] Create project
- [ ] Authentication → Email → **Enable email signups: OFF**
- [ ] Create users manually (or use “Invite”) and set passwords
- [ ] Add redirect URLs for your app
- [ ] Create `profiles` table and RLS (e.g. users can read/update own row)
- [ ] Optional: trigger to create `profiles` row on `auth.users` insert

---

## 10. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

This plan reflects: **profiles with username**, **shared UI primitives**, **manual user creation only (no magic link)**, **small scale**, and **leaderboards allowed for later but not built now.**
