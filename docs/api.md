# API Reference

All routes live under `src/app/api/`. Auth is JWT-based — the session cookie is sent automatically by the browser. Role checks happen server-side on each route handler.

---

## Authentication

### `POST /api/auth/[...nextauth]`
Auth.js credentials handler. Handles login, logout, and session refresh. Not called directly — use the Auth.js `signIn`/`signOut` helpers.

### `POST /api/register`
Register a new user account.

**Body:**
```json
{ "email": "string", "password": "string", "name": "string" }
```

**Response:** `201` with the new user, or `400` validation error.

---

## Users (Admin only)

### `GET /api/admin/users`
List all users with roles and musician status.

### `POST /api/admin/users`
Create a user directly (admin bypass).

### `GET /api/admin/users/[id]`
Get a single user.

### `PUT /api/admin/users/[id]`
Update a user's role or fields.

### `DELETE /api/admin/users/[id]`
Delete a user.

### `POST /api/admin/approve-musician`
Approve a pending musician application. Elevates the linked User's `role` to `"MUSICIAN"` and sets `musician.status` to `"APPROVED"`.

**Body:** `{ "musicianId": "string" }`

---

## Tracks

### `GET /api/tracks`
Returns tracks. Scope is role-aware:
- MUSICIAN — returns own tracks only
- ADMIN — returns all tracks
- USER — returns public/READY tracks

### `POST /api/tracks`
Create a track record (metadata only — use `/api/upload/audio` for the file).

**Body:** `{ "title", "artist", "fileUrl", "mimeType", "fileSize", "duration?", "bpm?", "key?" }`

### `GET /api/tracks/[id]`
Get a track with full metadata and AI analysis fields.

### `PUT /api/tracks/[id]`
Update track metadata. Owner or ADMIN only.

### `DELETE /api/tracks/[id]`
Delete track and its uploaded file. Owner or ADMIN only.

---

## Stages

### `GET /api/stages`
Returns stages. MUSICIAN gets their own; ADMIN gets all; authenticated USER gets public+active.

### `POST /api/stages`
Create a stage. MUSICIAN or ADMIN only.

**Body:** `{ "name", "latitude", "longitude", "altitude?", "radius?", "description?", "isPublic?" }`

### `GET /api/stages/[id]`
Full stage detail including visualizations and linked tracks.

### `PUT /api/stages/[id]`
Update stage. Owner or ADMIN only.

### `DELETE /api/stages/[id]`
Delete stage and cascade to visualizations. Owner or ADMIN only.

### `GET /api/stages/[id]/visualizations`
List visualizations for a stage, ordered by `sortOrder`.

### `POST /api/stages/[id]/visualizations`
Add a visualization to a stage.

**Body:** See [Visualization schema](./database.md#visualization).

---

## Visualizations

### `PUT /api/visualizations/[id]`
Update visualization config, position, or visibility. Owner or ADMIN only.

### `DELETE /api/visualizations/[id]`
Remove a visualization from its stage.

---

## AR / Location

### `GET /api/ar/nearby`
The core AR discovery endpoint. Returns all public, active stages within a given radius.

**Query params:**
| Param | Type | Default | Description |
|---|---|---|---|
| `lat` | float | required | User's latitude |
| `lng` | float | required | User's longitude |
| `radius` | int | 500 | Search radius in meters |

**Response:** Array of `StageWithVisualizations` — each stage includes:
- Full visualization list with parsed `config` objects
- `activeTrack` — the first linked READY track
- `distanceMeters` — calculated via Haversine formula
- Musician `displayName`

Distance is calculated server-side using the Haversine formula in `src/lib/geo.ts`.

### `GET /api/ar/stage/[id]`
Get a single stage with full visualization and track data. Used when entering a stage from the AR view.

---

## File Uploads

### `POST /api/upload/audio`
Upload an audio file for a track. Multipart form data.

**Form field:** `file` (audio file)

**Constraints:**
- Max size: 50 MB
- Allowed MIME types: `audio/mpeg`, `audio/wav`, `audio/ogg`, `audio/flac`, `audio/aac`, `audio/m4a`

**Response:** `{ "fileUrl": "/uploads/music/<filename>", "mimeType", "fileSize" }`

### `POST /api/upload/asset`
Upload a 3D asset (`.glb` / `.gltf`) for a `GLTF_ANIMATOR` visualization.

**Response:** `{ "assetUrl": "/uploads/assets/<filename>" }`

---

## AI

See [AI Integration](./ai-integration.md) for full details.

### `POST /api/ai/chat`
Streaming chat with Claude. Returns Server-Sent Events.

**Body:** `{ "messages": [{ "role": "user"|"assistant", "content": "string" }] }`

**Response:** SSE stream — `data: {"text": "..."}` chunks, terminated by `data: [DONE]`.

### `POST /api/ai/suggest-visualization`
Generate a `configJson` for a given visualization type.

**Body:** `{ "prompt": "string", "type": "VisualizationType", "trackMetadata?": {...} }`

**Response:** `{ "configJson": "string" }` — valid JSON matching the type's config interface.

### `POST /api/ai/analyze-track`
Analyze a track and generate AI metadata.

**Body:** `{ "trackId": "string" }`

**Response:** `{ "description": "string", "moodTags": string[], "suggestions": string[] }`

Saves results back to the Track record (`aiDescription`, `aiMoodTags`, `analysisJson`).
