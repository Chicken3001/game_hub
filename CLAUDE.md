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

Native SwiftUI iPhone app that shares this project's Supabase backend. Currently ships the Animal Match game only. Mirrors the `task_quest/ios` scaffolding conventions.

### Commands

- `cd ios && xcodegen` — Regenerate `GameHub.xcodeproj` from `project.yml`
- `xcodebuild -project ios/GameHub.xcodeproj -scheme GameHub -destination 'platform=iOS Simulator,name=iPhone 16 Pro' build` — Build for simulator

### Rules

- Do NOT modify Xcode configuration (project.yml, .xcodeproj, signing, build settings) unless explicitly asked.
- `project.yml` is the source of truth for all build settings. Never add settings directly to `.xcodeproj` — they are wiped on the next `xcodegen` run. Any new build setting must go in `project.yml`.

### Architecture

SwiftUI + supabase-swift (SPM). iOS 18.0+, Swift 6.0. Light theme, kid-friendly palette.

- **Auth**: Supabase Swift SDK with Keychain-backed token storage. `AuthService.shared` observes `authStateChanges`; `RootView` swaps between `LoginView` and `HubView` based on `isAuthenticated`.
- **State**: `@Observable` view models (e.g. `AnimalMatchViewModel`).
- **Folder layout**: `App/`, `Config/` (Config, Theme), `Services/` (SupabaseService, AuthService), `ViewModels/`, `Models/`, `Views/` (Auth, Hub, AnimalMatch), `Assets.xcassets/`.
- **Supabase credentials**: Hardcoded in `Config.swift` (same URL + anon key as web `.env.local`).
