# Auth & Authorization

Amplify uses **Auth.js v5** (NextAuth) with a credentials provider and JWT session strategy.

---

## Configuration

Located in `src/lib/auth.ts`.

### Provider

Email + password credentials. Passwords are hashed with **bcryptjs** (12 rounds) at registration. On sign-in, `bcryptjs.compare` verifies the submitted password against the stored hash.

### Session Strategy

JWT — sessions are stored in a signed cookie, not the database. There is no active `Session` table in use (Auth.js creates the table but JWT strategy bypasses it).

### Extended Session Fields

The default Auth.js session only includes `name`, `email`, and `image`. Amplify adds `role` and `id`:

```ts
// jwt callback — runs when token is created/refreshed
async jwt({ token, user }) {
  if (user) {
    token.role = user.role;
    token.id = user.id;
  }
  return token;
}

// session callback — runs when session is read
async session({ session, token }) {
  session.user.role = token.role;
  session.user.id = token.id;
  return session;
}
```

When consuming the session, always cast:
```ts
const user = session.user as { role?: string; id?: string; email?: string; name?: string };
```

---

## Reading the Session

### Server-side (layouts, API routes, server components)

```ts
import { auth } from "@/lib/auth";
const session = await auth();
if (!session) redirect("/login");
```

### Client-side

```ts
import { useSession } from "next-auth/react";
const { data: session } = useSession();
```

### Signing in / out (client-side)

```ts
import { signIn, signOut } from "next-auth/react";
await signIn("credentials", { email, password, redirectTo: "/ar" });
await signOut({ redirectTo: "/login" });
```

---

## Roles

| Role | Description |
|---|---|
| `USER` | Default after registration. Can access AR, Explore, Profile. |
| `MUSICIAN` | Approved artist. Access to Musician portal (tracks, stages, AI studio). |
| `ADMIN` | Full access including admin dashboard (user/musician/stage management). |

Roles are stored as plain strings on the `User.role` field (SQLite has no enum type).

### Becoming a Musician

1. Any USER can apply for musician access (creates a `Musician` record with `status: "PENDING"`)
2. An ADMIN approves the application via `/admin/musicians` or `POST /api/admin/approve-musician`
3. Approval sets `musician.status = "APPROVED"` and `user.role = "MUSICIAN"`

---

## Middleware & Route Protection

`src/middleware.ts` runs on every request and enforces access control before the page renders.

The middleware reads the JWT token from the session cookie and extracts `role`. Based on the requested path:

| Path pattern | Required | Redirect if denied |
|---|---|---|
| `/admin/*` | ADMIN | `/ar` |
| `/musician/*` | MUSICIAN or ADMIN | `/ar` |
| `/ar`, `/explore`, `/profile` | Authenticated | `/login` |
| `/login`, `/register` | None | — |
| `/` | — | `/ar` or `/login` |

Note: Next.js 16 prefers `proxy.ts` over `middleware.ts` — the current `middleware.ts` triggers a deprecation warning but is non-breaking.

---

## Auth Routes

Handled by Auth.js at `src/app/api/auth/[...nextauth]/route.ts`. Custom pages:

- Sign in: `/login`
- Register: `/register`

---

## Registration Flow

`POST /api/register` creates the user:

1. Validate body with `registerSchema` (Zod)
2. Check for existing email
3. Hash password with `bcryptjs.hash(password, 12)`
4. Create `User` with `role: "USER"`
5. Return `201` with the sanitized user (no password field)

After registration, redirect the user to `/login` to sign in.
