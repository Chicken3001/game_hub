# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
```

There is no test suite configured.

## Environment Variables

Requires a `.env.local` file with:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Architecture

This is a **Next.js 16 + Supabase** kids' game hub with TypeScript and Tailwind CSS v4.

### Route Structure

- `/` — Public landing page
- `/login` — Auth page (`src/app/(auth)/login/page.tsx`)
- `/hub` — Game selection dashboard (protected)
- `/games/<game-id>` — Individual game pages (protected)
- `/profile` — User profile / username setup (protected)

The `(protected)` route group (`src/app/(protected)/layout.tsx`) double-checks auth server-side and fetches the `profiles` table for the username. If no username is set, a banner prompts the user to visit `/profile`.

### Auth Flow

Auth is handled by `@supabase/ssr`. The middleware (`src/middleware.ts` → `src/lib/supabase/middleware.ts`) runs on every request, refreshes the session, and redirects:
- Authenticated users away from `/login` → `/hub`
- Unauthenticated users away from `/hub`, `/games/*`, `/profile` → `/login?redirect=<original-path>`

Two Supabase client factories exist:
- `src/lib/supabase/client.ts` — browser client, used in Client Components
- `src/lib/supabase/server.ts` — server client using `next/headers` cookies, used in Server Components and Route Handlers

### Game Registry

`src/games/registry.ts` holds the `GAMES` array (`GameEntry[]`) that drives the hub grid. To add a new game, add an entry here and create a corresponding `src/games/<id>/` directory and `src/app/(protected)/games/<id>/page.tsx`.

Each game lives in `src/games/<id>/` and exports its React component via an `index.ts` barrel. Game data/logic and the React component are co-located in the same directory.

### UI Components

Reusable primitives are in `src/components/ui/` (Button, Card, Input, Modal). The `Button` component has `variant` options including `"back"` for navigation buttons.

## iOS App (`ios/`)

Native SwiftUI iPhone app that shares this project's Supabase backend. Mirrors the `task_quest/ios` scaffolding conventions.

### Commands

- `cd ios && xcodegen` — Regenerate `GameHub.xcodeproj` from `project.yml`
- `xcodebuild -project ios/GameHub.xcodeproj -scheme GameHub -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=26.5' build` — Build for simulator

The destination must name a device that exists on an installed runtime — check with
`xcrun simctl list devices available`. `-scheme GameHub` is required; building with
`-target GameHub` fails because SPM package products (Supabase) never get wired up.

### Rules

- Do NOT modify Xcode configuration (project.yml, .xcodeproj, signing, build settings) unless explicitly asked.
- `project.yml` is the source of truth for most build settings. Never add settings directly to `.xcodeproj` — they are wiped on the next `xcodegen` run. Any new build setting must go in `project.yml`.
- The shared scheme is declared in `project.yml` under `schemes:`. It is committed, and `xcodegen` deletes anything it doesn't declare — do not remove that block or `xcodebuild -scheme GameHub` breaks.
- **Version + build number**: edit `ios/GameHub/Version.xcconfig` (not Xcode's General tab, not `project.yml`). This is the only way bumps survive `xcodegen`. Increment `CURRENT_PROJECT_VERSION` for every new upload to App Store Connect.

### Architecture

SwiftUI + supabase-swift (SPM). iOS 18.0+, Swift 6.0. Light theme, kid-friendly palette.

- **Auth**: Supabase Swift SDK with Keychain-backed token storage. `AuthService.shared` observes `authStateChanges`; `RootView` swaps between `LoginView` and `HubView` based on `isAuthenticated`. Sign-in only — there is no sign-up screen in the app.
- **State**: `@Observable` view models (e.g. `AnimalMatchViewModel`).
- **Folder layout**: `App/`, `Config/` (Config, Theme), `Services/`, `ViewModels/`, `Models/`, `Views/` (one folder per game), `Assets.xcassets/`.
- **Supabase credentials**: Hardcoded in `Config.swift` (same URL + anon key as web `.env.local`).
- **Games**: registered in `HubView.swift` — add a `GameEntry` to the `games` array and a `case` to `destination(for:)`.

### Multiplayer pattern

Turn-based multiplayer games (Tic-Tac-Toe, Checkers, Connect 4, Life) all share one shape:

- A single Postgres row holds the whole game (`board`/`players`, `current_turn`, `status`), so one `postgresChange` subscription filtered on `id` keeps every client in sync.
- A `<Game>Service` enum wraps the queries; a `<Game>LobbyViewModel` lists `waiting` rows; a `<Game>MultiplayerViewModel` applies moves optimistically then writes, guarding the update with `.eq("current_turn", expectedTurn)` so a stale client cannot clobber a turn that moved on.
- Presence (`channel.presenceChange()`) drives disconnect handling.

**The Game of Life** (`life`) extends this to 2–4 players:
- `Models/Life.swift` is the rules engine and is **Foundation-only on purpose** — no SwiftUI, no Supabase — so it can be compiled and tested headlessly, and so it ports directly to the web version.
- Player state lives in a `players` jsonb array on `life_games`, keeping the single-row/single-subscription design.
- Seating and starting go through the `life_join_game` / `life_start_game` `SECURITY DEFINER` RPCs, which take a row lock — a client-side read-modify-write would race on seat assignment.
- Unlike the 2-player games (which cancel when the opponent leaves), an away player's *turn is skipped* after 30s. Only the lowest-seated present client issues the skip; the `current_turn` guard makes duplicates no-ops.

## Supabase

Migrations live in `supabase/migrations/` but are applied via the Supabase MCP server, not the CLI. Keep the files in sync with what is deployed.

Two lint traps this project has hit:
- `revoke ... from public` does **not** remove Supabase's explicit `EXECUTE` grant to the `anon` role. Revoke `anon` by name on any `SECURITY DEFINER` RPC.
- Functions need an explicit `set search_path` or the linter flags a mutable search path.

Note: the `for update` RLS policies on the game tables have no `WITH CHECK`, so a seated player can in principle write arbitrary state. Consistent across all game tables; would need server-side turn resolution to close.
