# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Shilajit is a psychedelic journey companion app. It helps a **Seeker** (the person on the journey) track dosage, spore/strain sources, experiences (journal entries), and learnings (insights), and feeds those into three evolving outputs:

1. **Sacred Text** — AI-generated personal doctrine synthesized from all insights and beliefs
2. **Ritual Builder** — codified practices linked to beliefs
3. **The Tribe** — community feed where seekers share insights and excerpts

## Monorepo Structure

```
apps/
  web/      Next.js 14 — REST API backend + minimal landing page
  mobile/   Expo SDK 51 (React Native) — primary UI
packages/
  db/       Prisma schema + singleton PrismaClient (PostgreSQL via Supabase)
  types/    Pure TypeScript types shared across apps (no runtime deps)
```

## Commands

```bash
# Root (all workspaces via Turborepo)
npm run build          # build all apps/packages
npm run dev:web        # start Next.js dev server (port 3000)
npm run dev:mobile     # start Expo dev server
npm run typecheck      # tsc --noEmit across all workspaces
npm run lint           # eslint across all workspaces
npm run format         # prettier

# Database (runs in packages/db)
npm run db:generate    # prisma generate (after schema changes)
npm run db:push        # push schema to DB without migration (dev)
npm run db:migrate     # create and apply a named migration
```

```bash
# Mobile-specific
cd apps/mobile
npx expo start --ios      # iOS simulator
npx expo start --android  # Android emulator
```

## Environment Setup

Copy `.env.example` to `apps/web/.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase dashboard
- `DATABASE_URL` — connection pooler URL (port 6543, `?pgbouncer=true`)
- `DIRECT_URL` — direct connection URL (port 5432, for migrations)
- `OPENAI_API_KEY` — used for doctrine generation and insight extraction

For mobile, create `apps/mobile/.env`:
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## Architecture

### Data Flow

```
Mobile (Expo)
  ├── expo-sqlite (local, offline-first)
  │     └── Repositories: JourneyRepository, InsightRepository
  ├── React Query (state/cache)
  └── lib/sync/ ──── POST /api/sync ──── Next.js API ──── Prisma ──── Supabase PostgreSQL
```

The app works fully offline. Sync is triggered manually (or on app foreground) via `useSync()`. The sync protocol is a simple last-write-wins push/pull over `/api/sync`.

### Auth Flow

- Supabase magic-link email auth (no passwords)
- Mobile: session stored in `expo-secure-store`, injected as Bearer token on all API calls
- Next.js API: `middleware.ts` validates the Bearer token via Supabase and blocks unauthenticated requests to all `/api/*` routes (except `/api/auth`)
- `getAuthenticatedSeekerId()` returns the Supabase user ID; `seekerFromSupabaseId()` upserts the local `Seeker` record (lazy creation on first API call)

### Key Data Model

| Entity | Purpose |
|--------|---------|
| `Journey` | A single psychedelic session (substance, dose, spore source, intentions, setting) |
| `Entry` | Journal entry attached to a journey; phase = BEFORE/DURING/AFTER/INTEGRATION |
| `Insight` | Distilled learning; has `resonance` (1–10) and `isCore` flag |
| `Belief` | Codified belief linked to insights; has `BeliefCategory` |
| `Ritual` | Named practice linked to beliefs |
| `SacredText` | Versioned AI-generated doctrine |
| `TribePost` | Community-shared content with `Visibility` (PRIVATE/TRIBE/PUBLIC) |

Full Prisma schema lives at `packages/db/prisma/schema.prisma`.

### API Routes (apps/web/app/api/)

```
GET/POST   /api/journeys
GET/PATCH/DELETE /api/journeys/[id]
POST       /api/journeys/[id]/entries   (supports autoExtractInsights flag)
GET/POST   /api/insights
GET/POST   /api/beliefs
GET/POST   /api/rituals
GET/POST   /api/doctrine/generate       (GET = list versions, POST = trigger AI generation)
GET/POST   /api/tribe                   (paginated cursor feed)
GET/POST   /api/sync                    (GET = pull since timestamp, POST = push local changes)
```

All routes return `{ data: T, error: null }` on success or `{ data: null, error: { message } }` on failure (see `packages/types/src/index.ts` — `ApiResponse` / `ApiError`).

### AI Features (apps/web/lib/ai.ts)

- **Doctrine generation** (`generateSacredText`): Called by `POST /api/doctrine/generate`. Pulls all seeker's insights + beliefs + rituals, sends them to GPT-4o with a sacred-scribe system prompt. Writes first-person poetic prose organized into chapters.
- **Insight extraction** (`extractInsightsFromEntry`): Called automatically when `autoExtractInsights: true` is passed to `POST /api/journeys/[id]/entries` and the phase is AFTER or INTEGRATION. Uses GPT-4o-mini with JSON mode.

### Mobile Local DB (apps/mobile/lib/db/)

`lib/db/index.ts` — opens a single SQLite DB via `expo-sqlite` using WAL mode, initializes schema on first open. Repositories use synchronous SQLite methods (`getAllSync`, `getFirstSync`, `runSync`).

Local records include `synced_at` and `_deleted` columns for the sync protocol. Soft-delete rather than hard-delete keeps the sync protocol simple.

## Conventions

- All shared TypeScript types live in `@shilajit/types`. Never duplicate type definitions between apps.
- API routes must always use `handleError()` — never throw unhandled exceptions to the framework.
- The `Seeker` record is lazily created on the server via `seekerFromSupabaseId()`. The mobile app treats `seekerId` as `'local'` for offline records.
- `generateId()` in `apps/mobile/lib/utils.ts` produces cuid-like IDs for offline records; the same format as Prisma's `@default(cuid())` is intentional so IDs sync without conflict.
- Dark theme only. Design tokens (colors, spacing, radii, typography) live in `apps/mobile/constants/theme.ts`.
- Tribe posts go through the server (not local DB) — they require an active connection.
