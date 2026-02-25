# Deployment & Environment

## Environment Variables

Create `.env.local` in the project root with the following:

```env
# Database
DATABASE_URL="file:./dev.db"

# Auth.js
AUTH_SECRET="<random 32+ char string>"
NEXTAUTH_URL="http://localhost:3000"

# Anthropic
ANTHROPIC_API_KEY="sk-ant-..."

# File Storage
STORAGE_PROVIDER="local"
STORAGE_LOCAL_PATH="./uploads"
```

For production, set `NEXTAUTH_URL` to your actual domain and use a strong random `AUTH_SECRET`.

---

## Local Development

```bash
# Install dependencies
bun install

# Set up the database (first time)
npx prisma migrate dev --name init

# Seed default users
npx tsx prisma/seed.ts

# Start dev server (Next.js 16 + Turbopack on localhost:3000)
bun dev
```

Default credentials after seeding:

| Role | Email | Password |
|---|---|---|
| ADMIN | admin@amplify.app | admin123 |
| MUSICIAN | demo@amplify.app | musician123 |

---

## Adding Packages

Always use `bun` for package installation. `npm` has persistent network issues in this project.

```bash
bun add <package>
bun add -d <dev-package>
bunx shadcn@latest add <component>
```

**Never use `npm install` or `yarn add`.**

---

## Database Operations

```bash
# Create a new migration after schema changes
npx prisma migrate dev --name <descriptive-name>

# Open Prisma Studio (GUI)
npx prisma studio

# Seed the database
# Must use npx tsx — bun doesn't support better-sqlite3
npx tsx prisma/seed.ts

# Regenerate Prisma client (after schema changes)
npx prisma generate
```

---

## File Uploads (Local)

Uploaded files are written to `./uploads/` (project root), which is gitignored.

- Audio files → `./uploads/music/`
- 3D assets → `./uploads/assets/`

The Next.js dev server serves these as static files from `/uploads/...`.

### Switching to S3

Set `STORAGE_PROVIDER=s3` in `.env.local` and add the necessary AWS credentials. The `src/lib/storage.ts` abstraction handles the rest — no application code changes required.

---

## Build & Lint

```bash
bun run build    # Production build + TypeScript type check
bun run lint     # ESLint
```

---

## Next.js 16 / Turbopack Notes

Next.js 16 uses Turbopack by default. A few things to be aware of:

- **`canvas` alias required** — `canvas` is aliased to `src/lib/empty-module.ts` in both `turbopack` and `webpack` config sections to prevent Three.js from failing during server-side rendering. Both sections must be present to avoid build failures.
- **Middleware deprecation warning** — `src/middleware.ts` triggers a non-breaking deprecation warning; Next.js 16 prefers `proxy.ts`. This does not affect functionality.
- **`themeColor` metadata warning** — Use the `viewport` export instead of `themeColor` in `metadata`. Also non-breaking.

---

## Production Considerations

- Replace SQLite with PostgreSQL for concurrent writes in production (update `prisma.config.ts` and swap the adapter)
- Set `STORAGE_PROVIDER=s3` and configure AWS credentials for durable file storage
- Use a reverse proxy (Nginx / Caddy) in front of the Next.js server
- HTTPS is required for `getUserMedia` (camera) and Geolocation APIs in browsers
- Set a strong `AUTH_SECRET` — the JWT signing key
