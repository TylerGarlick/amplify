# Amplify

A GPS-anchored AR music platform. Musicians create virtual stages at real-world coordinates, attach tracks and audio-reactive 3D visualizations, and anyone nearby can experience them through their phone camera.

## Quick Start

```bash
# Install dependencies
bun install

# Set up environment — fill in values
cp .env.example .env.local

# Set up database
npx prisma migrate dev --name init
npx tsx prisma/seed.ts

# Start dev server
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

**Default credentials (from seed):**

| Role | Email | Password |
|---|---|---|
| Admin | admin@amplify.app | admin123 |
| Musician | demo@amplify.app | musician123 |

---

## Common Commands

```bash
bun dev                                  # dev server (localhost:3000)
bun run build                            # production build + type check
bun run lint                             # ESLint

npx prisma migrate dev --name <name>     # create and run a migration
npx prisma studio                        # database GUI
npx tsx prisma/seed.ts                   # seed the database

bun add <package>                        # add a dependency (use bun, not npm)
bunx shadcn@latest add <component>       # add a shadcn/ui component
```

---

## Environment Variables

Required in `.env.local`:

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="<random string>"
NEXTAUTH_URL="http://localhost:3000"
ANTHROPIC_API_KEY="sk-ant-..."
STORAGE_PROVIDER="local"
STORAGE_LOCAL_PATH="./uploads"
```

---

## How It Works

**For musicians:** Create an account → apply for musician access → get approved by an admin → create a Stage by placing it on a map at a real GPS location → upload Tracks → add audio-reactive Visualizations (with AI assistance in the AI Studio) → go live.

**For users:** Open the AR view → grant camera + GPS permissions → walk near a stage → enter it → see 3D visualizations overlaid on the camera feed, reacting to the music in real time.

---

## Documentation

- [Architecture Overview](docs/architecture.md) — project structure, route groups, key patterns
- [Database Schema](docs/database.md) — all models, fields, and Prisma 7 quirks
- [API Reference](docs/api.md) — all REST endpoints with request/response shapes
- [AR System](docs/ar-system.md) — coordinate system, render loop, audio reactivity, visualization types
- [AI Integration](docs/ai-integration.md) — Claude endpoints, SSE streaming, config generation
- [Auth & Authorization](docs/auth.md) — roles, JWT strategy, middleware, registration flow
- [State Management](docs/state-management.md) — Zustand stores, render loop pattern
- [Deployment & Environment](docs/deployment.md) — setup, S3, production notes

---

## Tech Stack

| | |
|---|---|
| Framework | Next.js 16 (Turbopack) |
| UI | React 19 + shadcn/ui + Tailwind CSS 4 |
| Database | SQLite + Prisma 7 |
| Auth | Auth.js v5 — JWT strategy |
| 3D / AR | Three.js |
| Audio | Tone.js + Web Audio API |
| State | Zustand |
| AI | Anthropic SDK (Claude Opus 4.6) |
| Maps | Leaflet |
