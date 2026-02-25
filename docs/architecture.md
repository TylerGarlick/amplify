# Architecture Overview

Amplify is a GPS-anchored AR music platform. Musicians create virtual stages at real-world coordinates, attach tracks and audio-reactive 3D visualizations, and anyone nearby can experience them live through their phone camera.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (Turbopack) |
| UI | React 19 + shadcn/ui + Tailwind CSS 4 |
| Database | SQLite via Prisma 7 |
| Auth | Auth.js v5 (NextAuth) — JWT strategy |
| 3D / AR | Three.js |
| Audio | Tone.js + Web Audio API |
| State | Zustand |
| AI | Anthropic SDK (Claude Opus 4.6) |
| Maps | Leaflet + react-leaflet |
| Data fetching | SWR |

---

## Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Public — /login, /register
│   ├── (main)/             # Any authenticated user — /ar, /explore, /profile
│   ├── (musician)/         # MUSICIAN or ADMIN — /musician/...
│   ├── (admin)/            # ADMIN only — /admin/...
│   └── api/                # REST API routes
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── layout/             # Nav, sidebars
│   ├── ar/                 # AR camera + overlay
│   ├── admin/              # Admin dashboard tables
│   └── shared/             # Small shared components
├── lib/
│   ├── auth.ts             # Auth.js config
│   ├── claude.ts           # Anthropic client singleton
│   ├── geo.ts              # GPS ↔ 3D coordinate math
│   ├── prisma.ts           # Prisma client singleton
│   ├── storage.ts          # File storage abstraction (local / S3)
│   ├── validators.ts       # Zod schemas
│   └── empty-module.ts     # Canvas alias (Three.js server safety)
├── stores/                 # Zustand state stores
│   ├── audioStore.ts
│   ├── locationStore.ts
│   └── arStore.ts
├── hooks/
│   ├── useGeolocation.ts
│   ├── useNearbyStages.ts
│   └── useDeviceOrientation.ts
├── types/
│   └── ar.ts               # AR & visualization type definitions
└── generated/prisma/       # Generated Prisma client (not node_modules)
```

---

## Route Groups & Access Control

Route groups are the primary mechanism for organizing access levels. Middleware at `src/middleware.ts` enforces role-based redirects using the JWT token role field.

| Group | Path Prefix | Required Role |
|---|---|---|
| `(auth)` | `/login`, `/register` | Public |
| `(main)` | `/ar`, `/explore`, `/profile` | Authenticated |
| `(musician)` | `/musician/*` | MUSICIAN or ADMIN |
| `(admin)` | `/admin/*` | ADMIN |

The root `/` redirects to `/ar` when authenticated, or `/login` when not.

---

## Server vs. Client Components

Next.js App Router defaults to server components. The split in this codebase:

- **Server components** — layouts that call `auth()`, pages that query `prisma` directly
- **Client components** — anything using `useState`, `useEffect`, hooks, refs, event handlers, Zustand stores (`"use client"` directive required)

Never mix them: do not add `"use client"` to files that import `auth()` or `prisma`.

---

## Key Architecture Patterns

### 1. Role-Based Access via JWT

The Auth.js `jwt` callback injects `role` and `id` into the JWT token. Middleware reads this token on every request and redirects unauthorized roles before the page renders.

### 2. Zustand in AR Render Loops

AR visualizations run at 60fps via `requestAnimationFrame`. React hooks cannot be called in a render loop. Instead, all stores expose `getState()`:

```ts
// In render loop — correct
const { beatData } = useAudioStore.getState();

// Not here — causes React re-renders at 60fps
const { beatData } = useAudioStore();
```

### 3. File Storage Abstraction

`src/lib/storage.ts` abstracts file I/O behind `saveFile()` and `deleteFile()`. Currently writes to `./uploads/`. Switch to S3 by setting `STORAGE_PROVIDER=s3` in env — no code changes needed.

### 4. Prisma 7 Custom Output

Prisma 7 generates the client to `src/generated/prisma` (not the default `node_modules`). Always import from there:

```ts
import { PrismaClient } from "@/generated/prisma";
```

The datasource URL lives in `prisma.config.ts`, not in the schema file.

### 5. SSE Streaming for AI Chat

The `/api/ai/chat` endpoint uses Server-Sent Events so Claude's response streams word-by-word to the client. Pattern:

```ts
claude.messages.stream(...)
  .on('text', (text) => {
    controller.enqueue(`data: ${JSON.stringify({ text })}\n\n`);
  });
// Terminate with:
controller.enqueue(`data: [DONE]\n\n`);
```

Note: `\n\n` must be escape sequences in string literals, not actual newlines.

---

## Related Docs

- [Database Schema](./database.md)
- [API Reference](./api.md)
- [AR System](./ar-system.md)
- [AI Integration](./ai-integration.md)
- [Auth & Authorization](./auth.md)
- [State Management](./state-management.md)
- [Deployment & Environment](./deployment.md)
