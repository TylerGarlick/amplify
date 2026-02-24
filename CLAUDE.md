# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
bun dev                          # start dev server (Next.js 16 + Turbopack)
bun run build                    # production build + TypeScript check
bun run lint                     # ESLint

# Database
npx prisma migrate dev --name <name>   # create and run a migration
npx prisma studio                      # GUI for the SQLite database
npx tsx prisma/seed.ts                 # seed the database (must use tsx, NOT bun — bun doesn't support better-sqlite3)

# Adding packages
bun add <package>                # use bun for all package installation (npm has persistent network issues)
bunx shadcn@latest add <component>  # add shadcn/ui components
```

**Default credentials (from seed):**
- Admin: `admin@amplify.app` / `admin123`
- Musician: `demo@amplify.app` / `musician123`

## Environment Variables

Required in `.env.local`:
```
DATABASE_URL="file:./dev.db"
AUTH_SECRET="<random string>"
NEXTAUTH_URL="http://localhost:3000"
ANTHROPIC_API_KEY="sk-ant-..."
STORAGE_PROVIDER="local"
STORAGE_LOCAL_PATH="./uploads"
```

## Architecture

### App Structure

Route groups map to roles and access levels:
- `src/app/(auth)/` — public (login, register)
- `src/app/(main)/` — any authenticated user (`/ar`, `/explore`, `/profile`)
- `src/app/(musician)/` — MUSICIAN or ADMIN role (`/musician/...`)
- `src/app/(admin)/` — ADMIN role only (`/admin/...`)
- `src/app/api/` — REST API routes

Middleware at `src/middleware.ts` enforces role-based redirects using the JWT token role.

### Database (Prisma 7 + SQLite)

**Critical Prisma 7 quirks:**
- The datasource `url` lives in `prisma.config.ts`, NOT in `prisma/schema.prisma`
- The adapter constructor takes a config object: `new PrismaBetterSqlite3({ url: "file:./dev.db" })` — not a `Database` instance
- Prisma client is generated to `src/generated/prisma` (not the default `node_modules`)
- Import as: `import { PrismaClient } from "@/generated/prisma"`
- Roles and enum-like values are plain `String` fields in the schema (SQLite has no native enums)

**Role values:** `"USER"` | `"MUSICIAN"` | `"ADMIN"`
**Musician status:** `"PENDING"` | `"APPROVED"` | `"SUSPENDED"`
**Track status:** `"PROCESSING"` | `"READY"` | `"ERROR"`
**Visualization types:** `"PARTICLE_SYSTEM"` | `"GEOMETRY_PULSE"` | `"WAVEFORM_RIBBON"` | `"FREQUENCY_BARS"` | `"SHADER_EFFECT"` | `"GLTF_ANIMATOR"` | `"LIGHT_SHOW"`

### Auth (Auth.js v5 / NextAuth)

- Credentials provider with bcrypt password hashing
- JWT strategy — `session.user` is extended with `role` and `id`
- Always cast: `session.user as { role?: string; id?: string }`
- `auth()` is the server-side session accessor; `signIn`/`signOut` from `next-auth/react` are client-side
- Route: `src/app/api/auth/[...nextauth]/route.ts`

### AR System

**GPS → 3D coordinates** (`src/lib/geo.ts`): User GPS position = world origin (0,0,0). Uses ENU (East-North-Up) space mapped to Three.js: East→+X, Up→+Y, North→-Z.

**AR render loop** (60fps, `src/components/ar/ARCanvas.tsx`): Uses `requestAnimationFrame`. Reads Zustand stores via `getState()` (not React hooks) to avoid React re-render overhead. Camera feed from `getUserMedia`, rendered as a Three.js background texture.

**Audio reactivity**: `AudioEngine` runs a Web Audio `AnalyserNode` (FFT 2048) splitting into bass/mid/treble bands each frame. Beat events scheduled via `Tone.Transport` at track BPM. All data flows through `audioStore` → read in render loop by each `ARVisualization`.

### State Management (Zustand)

Three stores in `src/stores/`:
- `locationStore` — GPS lat/lng/heading/accuracy
- `audioStore` — beat data (bass/mid/treble/beat/rms/waveform), playback state
- `arStore` — active stage, nearby stages list, session state

In render loops, use `useXxxStore.getState()` instead of the `useXxxStore()` hook to avoid triggering React renders.

### AI Integration (Anthropic)

Claude client singleton at `src/lib/claude.ts`. Three endpoints:
- `POST /api/ai/chat` — streaming SSE chat (model: `claude-opus-4-6`)
- `POST /api/ai/suggest-visualization` — returns `configJson` for a given `VisualizationType`
- `POST /api/ai/analyze-track` — returns description, mood tags, AR suggestions for a track

SSE streaming pattern: use `claude.messages.stream()`, emit `data: ${JSON.stringify({text})}\n\n` chunks, close with `data: [DONE]\n\n`. **String literals must use `\n\n` escape sequences, not actual newlines.**

### File Storage

`src/lib/storage.ts` abstracts file I/O. Currently writes to `./uploads/` (gitignored). The `saveFile(buffer, subdir, filename)` function returns a `/uploads/...` URL path. Swap the implementation for S3 by setting `STORAGE_PROVIDER=s3`.

### Next.js 16 / Turbopack Notes

- Next.js 16 uses Turbopack by default — both `turbopack` and `webpack` keys must be present in `next.config.ts` to avoid build failures
- `canvas` module is aliased to `src/lib/empty-module.ts` (required for Three.js server-side safety)
- `src/middleware.ts` triggers a deprecation warning (Next.js 16 prefers `proxy.ts`) — this is non-breaking
- `themeColor` in `metadata` exports triggers warnings — should use `viewport` export instead (non-breaking)

### Path Alias

`@/*` → `src/*` (configured in `tsconfig.json`)

### "use client" Boundaries

- Server components: layouts that call `auth()`, page components that use `prisma` directly
- Client components: anything using `useState`, `useEffect`, hooks, refs, event handlers, or Zustand stores
- Never add `"use client"` to files that import `auth()` or `prisma` — these are server-only
