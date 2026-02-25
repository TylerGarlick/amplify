# AI Integration

Amplify uses **Claude Opus 4.6** via the Anthropic SDK for three features: streaming chat, visualization config generation, and track analysis.

---

## Client Setup

`src/lib/claude.ts` exports a singleton Anthropic client:

```ts
import Anthropic from "@anthropic-ai/sdk";
export const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
```

The API key is set in `.env.local` as `ANTHROPIC_API_KEY`.

---

## Endpoints

### `POST /api/ai/chat` — Streaming Chat

A general-purpose chat assistant for musicians. The system prompt positions Claude as a creative assistant familiar with music, AR, and Amplify's features.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "How should I design a visualization for a jazz track?" }
  ]
}
```

**Response:** Server-Sent Events stream.

```
data: {"text":"You"}
data: {"text":" could"}
data: {"text":" use"}
...
data: [DONE]
```

**Implementation pattern:**

```ts
const stream = claude.messages.stream({
  model: "claude-opus-4-6",
  max_tokens: 1024,
  system: "You are a helpful assistant for Amplify...",
  messages,
});

stream.on("text", (text) => {
  controller.enqueue(`data: ${JSON.stringify({ text })}\n\n`);
});

await stream.finalMessage();
controller.enqueue(`data: [DONE]\n\n`);
```

**Important:** `\n\n` must be escape sequences in string literals — do not use actual newlines, as this breaks SSE parsing.

---

### `POST /api/ai/suggest-visualization` — Config Generation

Takes a natural language prompt and a visualization type, returns a valid `configJson` ready to save to the database.

**Request:**
```json
{
  "prompt": "Ethereal blue particles that explode on the beat",
  "type": "PARTICLE_SYSTEM",
  "trackMetadata": {
    "bpm": 128,
    "key": "Am",
    "energy": 0.8
  }
}
```

**Response:**
```json
{
  "configJson": "{\"count\":500,\"color\":\"#88ccff\",\"size\":0.05,\"spread\":3,\"lifetime\":2,\"beatMultiplier\":3}"
}
```

Claude is prompted to return **only valid JSON** with no explanation. The JSON must conform to the target type's config interface (see [Database docs](./database.md#visualization) for config shapes).

The `aiPrompt` field on the saved Visualization stores the original prompt for provenance.

---

### `POST /api/ai/analyze-track` — Track Analysis

Analyzes a track's metadata and generates descriptive text and mood tags. Results are written back to the Track record.

**Request:**
```json
{ "trackId": "clxxx..." }
```

**Response:**
```json
{
  "description": "A driving electronic track with heavy bass and euphoric synth leads...",
  "moodTags": ["euphoric", "driving", "energetic", "electronic"],
  "suggestions": [
    "Use PARTICLE_SYSTEM with high beatMultiplier for the drops",
    "FREQUENCY_BARS in circle layout suits the steady rhythm"
  ]
}
```

The response is also persisted to the Track:
- `aiDescription` — the description string
- `aiMoodTags` — JSON stringified array of tags
- `analysisJson` — the full raw response JSON

---

## AI Studio

The `/musician/ai-studio` page provides a chat UI that wraps the streaming chat endpoint. Musicians can ask questions about visualization design, AR staging, music theory, and Amplify features. The interface renders Claude's streaming responses in real time using the SSE client pattern.

---

## Model

All three endpoints use `claude-opus-4-6`. The model ID is hardcoded in each route handler — update there if switching models.
