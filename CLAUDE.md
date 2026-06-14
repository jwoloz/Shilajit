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
- `OPENAI_API_KEY` — Whisper transcription, GPT-4o vision OCR, insight extraction, doctrine generation
- `ANTHROPIC_API_KEY` — Claude companion chat
- `GOOGLE_AI_API_KEY` — Gemini companion chat (Google AI Studio)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google Workspace OAuth
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` — Spotify OAuth
- `GOOGLE_HOME_WEBHOOK_SECRET` — Dialogflow webhook auth

For mobile, create `apps/mobile/.env`:
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SPOTIFY_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_CLIENT_ID=...
```

## Architecture

### Data Flow

```
Mobile (Expo)
  ├── expo-sqlite (local, offline-first)
  │     └── Repositories: JourneyRepository, InsightRepository, DoseRepository, NoteRepository
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
| `DoseEvent` | Individual dose log within a journey; tracks `takenAt`, `doseMg`, `cumulativeMg` |
| `Note` | Multi-modal note: TEXT, AUDIO (transcribed), VISUAL (canvas SVG), PHOTO (OCR'd). Includes `mood` + `bodyFeel` (1–10) for time-series metrics |
| `Insight` | Distilled learning; has `resonance` (1–10) and `isCore` flag |
| `Belief` | Codified belief linked to insights; has `BeliefCategory` |
| `Ritual` | Named practice linked to beliefs |
| `SacredText` | Versioned AI-generated doctrine |
| `TribePost` | Community-shared content with `Visibility` (PRIVATE/TRIBE/PUBLIC) |
| `JourneyRecommendation` | AI-generated next steps, integration practices, tool suggestions |
| `Integration` | OAuth tokens for Spotify, Google, etc. One row per seeker per integration type |
| `SessionTrack` | Music played during a journey (Spotify/Brain.fm) |

Full Prisma schema lives at `packages/db/prisma/schema.prisma`.

### API Routes (apps/web/app/api/)

```
GET/POST        /api/journeys
GET/PATCH/DELETE /api/journeys/[id]
POST            /api/journeys/[id]/entries       (autoExtractInsights flag triggers Whisper→GPT-4o-mini)
GET/POST        /api/journeys/[id]/doses         (dose timeline per journey)
GET/POST        /api/journeys/[id]/notes         (multi-modal notes)
GET/POST        /api/journeys/[id]/recommend     (AI recommendations)
GET/POST        /api/journeys/[id]/analysis      (structured journey analysis)
GET/POST        /api/insights
GET/POST        /api/beliefs
GET/POST        /api/rituals
GET/POST        /api/doctrine/generate           (GET = list versions, POST = trigger AI generation)
GET/POST        /api/tribe                       (paginated cursor feed)
GET/POST        /api/sync                        (GET = pull since timestamp, POST = push local changes)
POST            /api/audio/transcribe            (Whisper audio→text or GPT-4o Vision image→text)
POST            /api/audio/companion             (AI companion chat: Claude or Gemini)
POST            /api/integrations/google         (?action=export-doc or export-sheet)
POST            /api/webhooks/google-home        (Dialogflow fulfillment webhook)
```

All routes return `{ data: T, error: null }` on success or `{ data: null, error: { message } }` on failure (see `packages/types/src/index.ts` — `ApiResponse` / `ApiError`).

### AI Features (apps/web/lib/ai.ts)

| Function | Model | Purpose |
|----------|-------|---------|
| `generateSacredText` | GPT-4o | Doctrine from insights + beliefs + rituals |
| `extractInsightsFromEntry` | GPT-4o-mini | Auto-extract insights after AFTER/INTEGRATION entries |
| `transcribeAudio` | Whisper-1 | Audio notes → text; also used by companion |
| `extractTextFromImage` | GPT-4o Vision | Photo notes → OCR text |
| `analyzeJourneyNotes` | GPT-4o | Structured analysis: themes, emotional arc, integration areas |
| `generateRecommendations` | GPT-4o | Next steps, tools, practices after a journey |
| `companionChat` | Claude Sonnet / Gemini 1.5 Flash | Real-time journey companion; provider toggled per request |

### Mobile Local DB (apps/mobile/lib/db/)

`lib/db/index.ts` — opens a single SQLite DB via `expo-sqlite` using WAL mode, initializes all tables on first open including `dose_events`, `notes`, and `reminders`.

All repositories use synchronous SQLite methods (`getAllSync`, `getFirstSync`, `runSync`). Local records include `synced_at` and `_deleted` columns for the sync protocol. Soft-delete keeps the sync protocol simple.

### Dose Timer & Notifications (apps/mobile/)

- `lib/notifications.ts` — wraps `expo-notifications`; schedules local notifications as journey reminders; stores them in the `reminders` SQLite table with `notification_id` for cancellation
- `app/journey/[id]/doses.tsx` — live timer (session elapsed + time since last dose), cumulative dose display, dose log, reminder presets (30/60/90/120 min)
- Timers use `setInterval` in a `useLiveTimer` hook

### Multi-modal Notes (apps/mobile/)

Notes screen (`app/journey/[id]/notes.tsx`) has four input modes:
- **Text** — plain input with mood + bodyFeel sliders (1–10)
- **Audio** — `expo-av` recording → send base64 to `/api/audio/transcribe` → editable transcription
- **Draw** — `DrawingCanvas` component (`components/canvas/DrawingCanvas.tsx`) using `react-native-svg` + `PanResponder`; saved as JSON-serialized SVG path array
- **Photo** — `expo-image-picker` → base64 → `/api/audio/transcribe?type=image` (GPT-4o Vision OCR)

### AI Companion (apps/mobile/app/companion.tsx)

Push-to-talk or type interface. Provider toggled between Claude and Gemini. Flow:
1. Mobile records audio → base64 → POST `/api/audio/companion`
2. Server transcribes (Whisper) → sends to Claude/Gemini with journey context as system prompt
3. Response spoken via `expo-speech`; stored in React state for conversation history

Navigate to companion from any journey hub: `/companion?journeyId=<id>`

### Integrations (apps/mobile/lib/integrations/)

| Integration | Auth | What it does |
|-------------|------|-------------|
| **Spotify** | OAuth via `expo-auth-session` | Logs currently-playing track, token stored in `expo-secure-store` |
| **Brain.fm** | Deep link | Opens `app.brain.fm` in browser |
| **Google Workspace** | OAuth via `expo-auth-session` | Exports journey to Google Doc; exports all metrics to Google Sheets |
| **Google Home** | Dialogflow webhook at `/api/webhooks/google-home` | Handles intents: `AddJourneyNote`, `LogDose`, `GetSessionStatus` |
| **Gemini** | API key (server-side) | Companion provider; audio sent server-side |
| **Claude** | API key (server-side) | Companion provider; audio transcribed then sent |

### Journey Hub Navigation

`app/journey/[id].tsx` is a hub screen. It does not contain journal/insights inline — it navigates to sub-screens:
- `/journey/[id]/doses` — dose timeline + timer
- `/journey/[id]/notes` — multi-modal notes
- `/journey/[id]/insights` — insights (existing)
- `/journey/[id]/recommend` — AI guidance
- `/companion?journeyId=[id]` — AI audio companion

## Conventions

- All shared TypeScript types live in `@shilajit/types`. Never duplicate type definitions between apps.
- API routes must always use `handleError()` — never throw unhandled exceptions to the framework.
- The `Seeker` record is lazily created on the server via `seekerFromSupabaseId()`. The mobile app treats `seekerId` as `'local'` for offline records.
- `generateId()` in `apps/mobile/lib/utils.ts` produces cuid-like IDs for offline records; same format as Prisma's `@default(cuid())` so IDs sync without conflict.
- Dark theme only. Design tokens (colors, spacing, radii, typography) live in `apps/mobile/constants/theme.ts`.
- Tribe posts go through the server (not local DB) — they require an active connection.
- `mood` and `bodyFeel` fields on `Note` (1–10) are the primary time-series metric signals. Aggregate them with `NoteRepository.getMoodSeries()` for charting patterns across journeys.
