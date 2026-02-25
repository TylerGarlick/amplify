# Database

Amplify uses **SQLite** via **Prisma 7** with the `better-sqlite3` adapter.

## Prisma 7 Quirks

Prisma 7 changed several defaults from Prisma 5/6. Key differences in this project:

- The datasource `url` lives in **`prisma.config.ts`**, not `prisma/schema.prisma`
- The adapter constructor takes a config object: `new PrismaBetterSqlite3({ url: "file:./dev.db" })` — not a raw `Database` instance
- The client is generated to **`src/generated/prisma`** (not `node_modules/.prisma`)
- Import as: `import { PrismaClient } from "@/generated/prisma"`
- SQLite has no native enums — all enum-like values are plain `String` fields

## Schema

### User

The base authentication record, extended by Auth.js.

| Field | Type | Notes |
|---|---|---|
| id | String | CUID primary key |
| email | String | Unique |
| password | String? | bcrypt hash; null for OAuth users |
| role | String | `"USER"` \| `"MUSICIAN"` \| `"ADMIN"` |
| emailVerified | DateTime? | Set by OAuth providers |
| image | String? | Avatar URL |

Relations: `accounts[]`, `sessions[]`, `musician` (1:1 optional)

---

### Musician

An artist profile. Created when a USER applies for musician access and is approved by an admin.

| Field | Type | Notes |
|---|---|---|
| id | String | CUID |
| userId | String | Unique FK → User |
| displayName | String | |
| bio | String? | |
| avatarUrl | String? | |
| status | String | `"PENDING"` \| `"APPROVED"` \| `"SUSPENDED"` |

Relations: `user`, `tracks[]`, `stages[]`

---

### Track

An uploaded audio file with metadata.

| Field | Type | Notes |
|---|---|---|
| id | String | CUID |
| musicianId | String | FK → Musician |
| title | String | |
| artist | String | |
| duration | Int? | Seconds |
| fileUrl | String | `/uploads/music/<filename>` |
| mimeType | String | e.g. `audio/mpeg` |
| fileSize | Int | Bytes |
| bpm | Float? | Beats per minute |
| key | String? | Musical key |
| energy | Float? | 0–1 energy level |
| analysisJson | String? | Raw AI analysis JSON |
| aiDescription | String? | Claude-generated description |
| aiMoodTags | String? | JSON array of mood strings |
| status | String | `"PROCESSING"` \| `"READY"` \| `"ERROR"` |

Relations: `musician`, `stageTrackLinks[]`

---

### Stage

A GPS-anchored performance space. The center of an AR experience.

| Field | Type | Notes |
|---|---|---|
| id | String | CUID |
| musicianId | String | FK → Musician |
| name | String | |
| description | String? | |
| latitude | Float | WGS84 degrees |
| longitude | Float | WGS84 degrees |
| altitude | Float | Meters above sea level (default 0) |
| radius | Float | Detection radius in meters (default 50) |
| isActive | Boolean | Default true |
| isPublic | Boolean | Default true |

Relations: `musician`, `visualizations[]`, `stageTrackLinks[]`

---

### StageTrack

Junction table linking Stages to Tracks (many-to-many with metadata).

| Field | Type | Notes |
|---|---|---|
| id | String | CUID |
| stageId | String | FK → Stage |
| trackId | String | FK → Track |
| sortOrder | Int | Playback order |
| loopMode | String | `"single"` \| `"playlist"` \| `"shuffle"` |

Unique constraint: `(stageId, trackId)`

---

### Visualization

An AR effect anchored to a stage, described by type and JSON config.

| Field | Type | Notes |
|---|---|---|
| id | String | CUID |
| stageId | String | FK → Stage |
| name | String | |
| type | String | See visualization types below |
| offsetX/Y/Z | Float | Position relative to stage center (meters, ENU) |
| rotationX/Y/Z | Float | Euler angles (radians) |
| scaleX/Y/Z | Float | Scale factors |
| configJson | String | Type-specific JSON config |
| assetUrl | String? | GLTF model URL (GLTF_ANIMATOR only) |
| reactToFrequency | String | `"bass"` \| `"mid"` \| `"treble"` \| `"all"` |
| reactIntensity | Float | 0–1 (default 0.5) |
| aiPrompt | String? | The prompt used to generate this config |
| sortOrder | Int | Render order |
| isVisible | Boolean | Default true |

**Visualization Types:**

| Type | Description |
|---|---|
| `PARTICLE_SYSTEM` | Emitted particles reacting to beats |
| `GEOMETRY_PULSE` | 3D geometry (sphere/box/torus) that pulses to audio |
| `WAVEFORM_RIBBON` | Ribbon mesh driven by the audio waveform |
| `FREQUENCY_BARS` | Spectrum visualizer (line, arc, or circle layout) |
| `SHADER_EFFECT` | Custom GLSL vertex + fragment shaders |
| `GLTF_ANIMATOR` | Plays animation clips from a `.glb` model |
| `LIGHT_SHOW` | Orbiting lights that react to audio bands |

---

### Account & Session

Standard Auth.js v5 tables for OAuth provider support.

---

## Common Commands

```bash
# Create and run a new migration
npx prisma migrate dev --name <descriptive-name>

# Open the Prisma Studio GUI
npx prisma studio

# Seed the database with default users
# Must use tsx — bun doesn't support better-sqlite3
npx tsx prisma/seed.ts

# Regenerate the Prisma client after schema changes
npx prisma generate
```

## Default Seed Data

| Role | Email | Password |
|---|---|---|
| ADMIN | admin@amplify.app | admin123 |
| MUSICIAN | demo@amplify.app | musician123 |
