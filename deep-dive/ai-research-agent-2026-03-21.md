# AI Research Agent Architecture
## Amplify Deep Dive — 2026-03-21

**Purpose:** Research document for implementing AI Research Agent capabilities in TylerGarlick/amplify (musician-focused AR app with stage discovery, track analysis, and social features).

---

## Table of Contents

1. [Ollama Local Inference](#1-ollama-local-inference)
2. [MCP Servers](#2-mcp-servers)
3. [Proactive-Agent Workflow](#3-proactive-agent-workflow)
4. [Architecture Diagrams](#4-architecture-diagrams)
5. [Recommendations for Amplify](#5-recommendations-for-amplify)
6. [Implementation Priority & Sequence](#6-implementation-priority--sequence)

---

## 1. Ollama Local Inference

### Overview

Ollama enables local LLM inference with a simple API, eliminating cloud API costs and latency. Models run entirely on-device.

### Server Setup

```bash
# Install Ollama (macOS/Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Start server (runs on port 11434 by default)
ollama serve

# Pull models
ollama pull llama3.2        # General purpose
ollama pull nomic-embed-text # Embeddings
ollama pull mxbai-embed-large # Alternative embeddings

# Verify
curl http://localhost:11434/api/tags
```

**Environment Variables for Amplify:**
```bash
OLLAMA_HOST=0.0.0.0:11434        # Allow external access
OLLAMA_MODELS=/path/to/models   # Custom model directory
OLLAMA_NUM_PARALLEL=2            # Limit concurrent requests
OLLAMA_KEEP_ALIVE=5m             # Keep model loaded for 5 min
```

### API Integration (React/TypeScript)

**Client Singleton:**

```typescript
// src/lib/ollama.ts
const OLLAMA_BASE = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434';

interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    num_predict?: number;
    stop?: string[];
  };
  context?: number[];  // For conversation continuity
}

interface OllamaStreamChunk {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
}

class OllamaClient {
  private baseUrl: string;

  constructor(baseUrl: string = OLLAMA_BASE) {
    this.baseUrl = baseUrl;
  }

  async generate(request: OllamaRequest): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }
    
    return (await response.json()).response;
  }

  async *stream(request: OllamaRequest): AsyncGenerator<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const parsed: OllamaStreamChunk = JSON.parse(line);
          yield parsed.response;
        } catch {
          // Skip malformed JSON
        }
      }
    }
  }

  async embeddings(text: string, model: string = 'nomic-embed-text'): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: text }),
    });
    
    return (await response.json()).embedding;
  }
}

export const ollama = new OllamaClient();
```

**React Hook with Streaming:**

```typescript
// src/hooks/useOllamaChat.ts
import { useState, useCallback, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface UseOllamaChatOptions {
  model?: string;
  temperature?: number;
  onChunk?: (text: string) => void;
}

export function useOllamaChat(options: UseOllamaChatOptions = {}) {
  const { model = 'llama3.2', temperature = 0.7, onChunk } = options;
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const contextRef = useRef<number[] | null>(null);

  const sendMessage = useCallback(async (userMessage: string) => {
    setIsStreaming(true);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    let fullResponse = '';

    try {
      for await (const chunk of ollama.stream({
        model,
        prompt: buildPrompt(messages, userMessage),
        temperature,
        context: contextRef.current ?? undefined,
        stream: true,
      })) {
        fullResponse += chunk;
        onChunk?.(chunk);
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return [...prev.slice(0, -1), { ...last, content: fullResponse }];
          }
          return [...prev, { role: 'assistant', content: fullResponse }];
        });
      }
    } finally {
      setIsStreaming(false);
    }
  }, [model, temperature, messages, onChunk]);

  return { messages, sendMessage, isStreaming };
}

function buildPrompt(messages: Message[], current: string): string {
  const system = 'You are AmplifyAI, a helpful assistant for musicians.';
  const history = messages.map(m => `${m.role}: ${m.content}`).join('\n');
  return `${system}\n\n${history}\nuser: ${current}\nassistant:`;
}
```

### Model Management

**Recommended Models for Amplify:**

| Model | Size | Use Case | Memory |
|-------|------|----------|--------|
| `llama3.2` | 2GB | General chat, suggestions | ~4GB VRAM |
| `llama3.2:3b` | 2GB | Fast responses, mobile | ~4GB VRAM |
| `phi3.5` | 2.2GB | Lightweight alternative | ~4GB VRAM |
| `nomic-embed-text` | 274MB | Embeddings for search | ~1GB VRAM |
| `mxbai-embed-large` | 353MB | Higher quality embeddings | ~1GB VRAM |

**Model Selection Logic:**

```typescript
// src/lib/model-selector.ts
interface ModelConfig {
  name: string;
  maxTokens: number;
  temperature: number;
  useCase: 'chat' | 'analysis' | 'embeddings' | 'fast';
}

const MODELS: Record<string, ModelConfig> = {
  chat: { name: 'llama3.2', maxTokens: 4096, temperature: 0.7, useCase: 'chat' },
  analysis: { name: 'llama3.2', maxTokens: 8192, temperature: 0.3, useCase: 'analysis' },
  fast: { name: 'llama3.2:3b', maxTokens: 2048, temperature: 0.7, useCase: 'fast' },
  embeddings: { name: 'nomic-embed-text', maxTokens: 512, temperature: 0.0, useCase: 'embeddings' },
};

export function selectModel(useCase: keyof typeof MODELS): ModelConfig {
  // Mobile detection
  if (typeof window !== 'undefined' && isMobile()) {
    if (useCase === 'embeddings') return MODELS.embeddings;
    return MODELS.fast;
  }
  return MODELS[useCase];
}
```

### Streaming Responses

**SSE Pattern for Next.js API Routes:**

```typescript
// src/app/api/ai/chat-stream/route.ts
import { ollama } from '@/lib/ollama';
import { selectModel } from '@/lib/model-selector';

export async function POST(req: Request) {
  const { message, context } = await req.json();
  const model = selectModel('chat');

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of ollama.stream({
          model: model.name,
          prompt: message,
          temperature: model.temperature,
          context,
        })) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
        }
      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(error) })}\n\n`));
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### Fallback Strategies

```typescript
// src/lib/ai-fallback.ts
type AIProvider = 'ollama' | 'anthropic' | 'openai';

interface AIResponse {
  text: string;
  provider: AIProvider;
  latencyMs: number;
}

class AIFallbackClient {
  private providers: AIProvider[] = ['ollama', 'anthropic', 'openai'];

  async generate(prompt: string, preferProvider?: AIProvider): Promise<AIResponse> {
    const ordered = preferProvider
      ? [preferProvider, ...this.providers.filter(p => p !== preferProvider)]
      : this.providers;

    for (const provider of ordered) {
      const start = Date.now();
      try {
        const result = await this.attemptProvider(provider, prompt);
        return { text: result, provider, latencyMs: Date.now() - start };
      } catch (error) {
        console.warn(`Provider ${provider} failed:`, error);
        continue;
      }
    }

    throw new Error('All AI providers failed');
  }

  private async attemptProvider(provider: AIProvider, prompt: string): Promise<string> {
    switch (provider) {
      case 'ollama':
        return ollama.generate({ model: 'llama3.2', prompt, stream: false });
      case 'anthropic':
        return anthropic.generate(prompt);  // Your existing Claude integration
      case 'openai':
        return openai.generate(prompt);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  // Check which providers are available
  async healthCheck(): Promise<Record<AIProvider, boolean>> {
    return {
      ollama: await this.checkOllama(),
      anthropic: await this.checkAnthropic(),
      openai: await this.checkOpenAI(),
    };
  }

  private async checkOllama(): Promise<boolean> {
    try {
      const res = await fetch('http://localhost:11434/api/tags', { 
        signal: AbortSignal.timeout(2000) 
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const aiClient = new AIFallbackClient();
```

### Pros/Cons: Ollama Local Inference

| Pros | Cons |
|------|------|
| ✅ Zero API costs after setup | ❌ Requires local GPU RAM (4GB+ for good models) |
| ✅ No network latency | ❌ Model quality vs cloud (llama3.2 < Claude Opus) |
| ✅ Privacy: data never leaves device | ❌ Battery drain on mobile |
| ✅ Works offline | ❌ Model management overhead |
| ✅ Custom fine-tuned models possible | ❌ Memory constraints on mobile devices |
| ✅ Fast cold starts after first load | ❌ No built-in vision/multimodal in base Ollama |

---

## 2. MCP Servers

### Overview

The Model Context Protocol (MCP) is a standardized way for AI models to interact with external tools, data sources, and services. MCP servers act as bridges between the LLM and resources.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AI Application                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   Client    │───▶│  MCP Client │───▶│ MCP Server  │    │
│  │  (React)    │    │  (SDK)       │    │ (Your API)  │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│                                               │              │
│                          ┌────────────────────┼────────────┐│
│                          ▼                    ▼            ▼│
│                    ┌──────────┐        ┌──────────┐  ┌─────┐│
│                    │ Database │        │ External │  │File ││
│                    │ (Prisma) │        │ Services │  │System││
│                    └──────────┘        └──────────┘  └─────┘│
└─────────────────────────────────────────────────────────────┘
```

### How MCP Servers Work

**Protocol Flow:**

1. **Handshake**: Client connects, exchanges capability announcements
2. **Resources**: Servers expose data (files, database records, APIs)
3. **Tools**: Servers expose callable functions with schemas
4. **Prompts**: Servers provide reusable prompt templates
5. **Sampling**: Servers can request the LLM to perform work

**MCP Message Types:**

```typescript
// Core message types
type MCPMessage =
  | { method: 'initialize', params: { protocolVersion: string; capabilities: ClientCapabilities } }
  | { method: 'tools/list', params: {} }
  | { method: 'tools/call', params: { name: string; arguments: Record<string, unknown> } }
  | { method: 'resources/list', params: {} }
  | { method: 'resources/read', params: { uri: string } }
  | { method: 'resources/subscribe', params: { uri: string } };
```

### Existing MCP Server Implementations

| Server | Purpose | GitHub |
|--------|---------|--------|
| `mcp-arangodb` | Document database | github.com/ArangoDB/mcp-arangodb |
| `mcp-sqlite` | Local database | github.com/denoland/mcp-sqlite |
| `filesystem` | File operations | Built into Claude Desktop |
| `fetch` | Web fetching | Built into Claude Desktop |
| `postgres-mcp` | PostgreSQL access | github.com/franck237/mcp-postgres |
| `redis-mcp` | Redis caching | github.com/UpbeatRabbit/mcp-redis |
| `github-mcp` | GitHub API | github.com/github/github-mcp |
| `slack-mcp` | Slack integration | github.com/SlackAPI/mcp-slack |

### Amplify MCP Server Implementation

**Server Structure:**

```typescript
// amplify-mcp-server/src/index.ts
import { MCPServer } from '@modelcontextprotocol/sdk/server';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse';
import { PrismaClient } from '@amplify/generated/prisma';
import { ollama } from '../lib/ollama';

const prisma = new PrismaClient();

const server = new MCPServer({
  name: 'amplify-mcp',
  version: '1.0.0',
  capabilities: {
    tools: {},
    resources: {},
  },
});

// ─────────────────────────────────────────────────
// TOOLS: Expose Amplify functionality as tools
// ─────────────────────────────────────────────────

server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'get_nearby_stages',
      description: 'Find music stages near a GPS location',
      inputSchema: {
        type: 'object',
        properties: {
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          radiusMeters: { type: 'number', default: 5000 },
        },
        required: ['latitude', 'longitude'],
      },
    },
    {
      name: 'analyze_track',
      description: 'Analyze a music track for mood, tempo, and AR suggestions',
      inputSchema: {
        type: 'object',
        properties: {
          trackId: { type: 'string' },
          userId: { type: 'string' },
        },
        required: ['trackId', 'userId'],
      },
    },
    {
      name: 'get_stage_analytics',
      description: 'Get engagement analytics for a music stage',
      inputSchema: {
        type: 'object',
        properties: {
          stageId: { type: 'string' },
          period: { type: 'string', enum: ['day', 'week', 'month'], default: 'week' },
        },
        required: ['stageId'],
      },
    },
    {
      name: 'suggest_visualization',
      description: 'Get AI suggestions for AR visualization based on track audio analysis',
      inputSchema: {
        type: 'object',
        properties: {
          audioData: { type: 'string' }, // Base64 encoded audio features
          mood: { type: 'string' },
        },
        required: ['mood'],
      },
    },
  ],
}));

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_nearby_stages':
      return handleNearbyStages(args);

    case 'analyze_track':
      return handleAnalyzeTrack(args);

    case 'get_stage_analytics':
      return handleStageAnalytics(args);

    case 'suggest_visualization':
      return handleSuggestVisualization(args);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// ─────────────────────────────────────────────────
// TOOL IMPLEMENTATIONS
// ─────────────────────────────────────────────────

async function handleNearbyStages(args: { latitude: number; longitude: number; radiusMeters?: number }) {
  // Using H3 for hexagonal spatial indexing
  const stages = await prisma.stage.findMany({
    where: {
      latitude: { gte: args.latitude - 0.05, lte: args.latitude + 0.05 },
      longitude: { gte: args.longitude - 0.05, lte: args.longitude + 0.05 },
      status: 'APPROVED',
    },
    take: 20,
    orderBy: { createdAt: 'desc' },
  });

  // Filter by actual distance (H3 approximation)
  const nearby = stages.filter(stage => {
    const dist = haversineDistance(args.latitude, args.longitude, stage.latitude, stage.longitude);
    return dist <= (args.radiusMeters ?? 5000);
  });

  return {
    content: [{ type: 'text', text: JSON.stringify(nearby) }],
  };
}

async function handleAnalyzeTrack(args: { trackId: string; userId: string }) {
  const track = await prisma.track.findUnique({
    where: { id: args.trackId },
    include: { musician: true },
  });

  if (!track) throw new Error('Track not found');

  // Get audio analysis from stored analysis
  const analysis = track.analysis 
    ? JSON.parse(track.analysis) 
    : await generateAnalysis(track.audioUrl);

  // Generate AR suggestions using Ollama
  const prompt = `Analyze this music track and suggest AR visualizations:
    - BPM: ${analysis.bpm}
    - Key: ${analysis.key}
    - Mood: ${analysis.mood}
    - Genre: ${track.genre}
    
    Suggest 3 visualization types that would complement this track.`;

  const suggestion = await ollama.generate({
    model: 'llama3.2',
    prompt,
    options: { temperature: 0.7 },
  });

  return {
    content: [{ type: 'text', text: JSON.stringify({ analysis, suggestion }) }],
  };
}

async function handleSuggestVisualization(args: { audioData?: string; mood: string }) {
  // Direct Ollama call for visualization suggestion
  const prompt = `Based on mood "${args.mood}", suggest the best AR visualization type:
    - PARTICLE_SYSTEM: For energetic, upbeat tracks
    - WAVEFORM_RIBBON: For ambient, flowing music
    - GEOMETRY_PULSE: For bass-heavy tracks
    - FREQUENCY_BARS: For rhythmic, beat-driven music
    
    Return JSON with: { type, reason, colorPalette }`;

  const result = await ollama.generate({
    model: 'llama3.2',
    prompt,
    options: { temperature: 0.5 },
  });

  return {
    content: [{ type: 'text', text: result }],
  };
}

async function handleStageAnalytics(args: { stageId: string; period?: string }) {
  const days = args.period === 'day' ? 1 : args.period === 'month' ? 30 : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [visits, likes, shares] = await Promise.all([
    prisma.stageVisit.count({ where: { stageId: args.stageId, visitedAt: { gte: since } } }),
    prisma.stageLike.count({ where: { stageId: args.stageId, createdAt: { gte: since } } }),
    prisma.stageShare.count({ where: { stageId: args.stageId, createdAt: { gte: since } } }),
  ]);

  return {
    content: [{ type: 'text', text: JSON.stringify({ visits, likes, shares, period: args.period }) }],
  };
}

// ─────────────────────────────────────────────────
// RESOURCES: Expose Amplify data as readable resources
// ─────────────────────────────────────────────────

server.setRequestHandler('resources/list', async () => ({
  resources: [
    { uri: 'amplify://stages/my', name: 'My Stages', description: 'Stages you own' },
    { uri: 'amplify://tracks/my', name: 'My Tracks', description: 'Your uploaded tracks' },
    { uri: 'amplify://tribes/my', name: 'My Tribes', description: 'Your tribe memberships' },
    { uri: 'amplify://analytics/dashboard', name: 'Analytics', description: 'Your analytics overview' },
  ],
}));

server.setRequestHandler('resources/read', async (request) => {
  const uri = request.params.uri;

  switch (uri) {
    case 'amplify://tracks/my':
      const tracks = await prisma.track.findMany({ where: { musicianId: 'current' } });
      return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(tracks) }] };

    // ... handle other resources

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
});

// ─────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────

async function main() {
  const transport = new SSEServerTransport('/mcp', server);
  await server.connect(transport);
  console.log('Amplify MCP Server running on /mcp');
}

main().catch(console.error);
```

**Integration with Existing API Routes:**

```typescript
// src/app/api/mcp/route.ts
// Expose MCP over SSE for web clients
import { createMCPClient } from '@modelcontextprotocol/sdk/client';

export async function GET() {
  const client = await createMCPClient({
    transport: 'sse',
    url: process.env.MCP_SERVER_URL || 'http://localhost:3001/mcp',
  });

  // Proxy MCP traffic through this route
  return new Response('MCP connection established', { status: 200 });
}
```

### MCP for Amplify's Specific Features

**Stage Discovery:**
```typescript
// MCP tool: discover_stages
{
  name: 'discover_stages',
  description: 'Find stages matching user preferences and location',
  inputSchema: {
    type: 'object',
    properties: {
      location: { latitude: number, longitude: number },
      preferences: { genres: string[], mood: string[] },
      limit: { type: 'number', default: 10 }
    }
  }
}
```

**Track Analysis Pipeline:**
```typescript
// MCP tool: analyze_and_suggest
{
  name: 'analyze_and_suggest',
  description: 'Full track analysis with AR visualization suggestions',
  inputSchema: {
    type: 'object',
    properties: {
      trackId: { type: 'string' },
      includeSocial: { type: 'boolean', default: true }
    }
  }
}
```

### Pros/Cons: MCP Servers

| Pros | Cons |
|------|------|
| ✅ Standardized tool definition | ❌ Still evolving spec (0.x versions) |
| ✅ Reusable across AI frameworks | ❌ Server implementation required |
| ✅ Type-safe schemas with JSON Schema | ❌ Debugging distributed systems harder |
| ✅ Streaming support built-in | ❌ Security considerations for tool execution |
| ✅ Resources + tools in one protocol | ❌ Learning curve for schema design |
| ✅ Enables AI-to-AI communication | ❌ Not all providers support MCP yet |

---

## 3. Proactive-Agent Workflow

### Overview

Proactive agents don't just respond — they anticipate needs, take initiative, and continuously improve. The **WAL Protocol**, **Working Buffer**, **Autonomous Crons**, and **Self-Improvement Loops** are core patterns.

### WAL Protocol (Write-Ahead Logging)

**Core Principle:** Capture critical state changes BEFORE responding. Chat history is a buffer; persistent state files are the real storage.

```typescript
// Example WAL implementation for Amplify
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

interface WALEntry {
  timestamp: string;
  type: 'correction' | 'decision' | 'preference' | 'context';
  key: string;
  value: unknown;
}

class AmplifyWAL {
  private walPath: string;
  private buffer: WALEntry[] = [];

  constructor(walPath: string = './memory/amplify.wal') {
    this.walPath = walPath;
  }

  // Scan every user message for WAL triggers
  shouldCapture(message: string): boolean {
    const triggers = [
      /\b(not|don't|isn't|wasn't|won't|can't)\b/i,  // Corrections
      /\b(actually|prefer|rather|use|choose|pick)\b/i,  // Preferences
      /\b(let's|go with|do this|make it|set it)\b/i,  // Decisions
      /\b(name|called|known as|alias|nickname)\b/i,  // Identifiers
    ];
    return triggers.some(t => t.test(message));
  }

  async log(entry: Omit<WALEntry, 'timestamp'>): Promise<void> {
    const full: WALEntry = { ...entry, timestamp: new Date().toISOString() };
    this.buffer.push(full);
    await writeFile(this.walPath, JSON.stringify(full) + '\n', { flag: 'a' });
  }

  async recover(): Promise<WALEntry[]> {
    try {
      const data = await readFile(this.walPath, 'utf-8');
      return data.split('\n').filter(Boolean).map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }
}

export const amplifyWAL = new AmplifyWAL();
```

### Working Buffer Protocol

**Purpose:** Survive context loss between compaction cycles.

```typescript
// src/lib/working-buffer.ts
interface BufferEntry {
  timestamp: string;
  role: 'human' | 'agent';
  summary: string;
  keyDetails: string[];
}

class WorkingBuffer {
  private bufferPath: string;
  private statusPath: string;
  private isActive = false;

  constructor(
    bufferPath: string = './memory/working-buffer.md',
    statusPath: string = './memory/buffer-status.json'
  ) {
    this.bufferPath = bufferPath;
    this.statusPath = statusPath;
  }

  async checkContext(contextPercent: number): Promise<void> {
    if (contextPercent >= 60 && !this.isActive) {
      await this.activate();
    } else if (contextPercent < 60 && this.isActive) {
      await this.deactivate();
    }
  }

  async append(entry: { humanMessage: string; agentSummary: string; keyDetails: string[] }): Promise<void> {
    if (!this.isActive) return;

    const content = `
---

## ${entry.humanMessage.slice(0, 100)}

**Agent Summary:** ${entry.agentSummary}

**Key Details:** ${entry.keyDetails.join(', ') || 'none'}
`;
    await writeFile(this.bufferPath, content, { flag: 'a' });
  }

  async recover(): Promise<BufferEntry[]> {
    try {
      const data = await readFile(this.bufferPath, 'utf-8');
      return this.parseBuffer(data);
    } catch {
      return [];
    }
  }

  private async activate(): Promise<void> {
    this.isActive = true;
    await writeFile(this.bufferPath, `# Working Buffer (Danger Zone)\n**Started:** ${new Date().toISOString()}\n`, {});
  }

  private async deactivate(): Promise<void> {
    this.isActive = false;
    await writeFile(this.statusPath, JSON.stringify({ active: false }), {});
  }

  private parseBuffer(data: string): BufferEntry[] {
    const entries: BufferEntry[] = [];
    const blocks = data.split('---\n').filter(b => b.trim());

    for (const block of blocks) {
      const summaryMatch = block.match(/\*\*Agent Summary:\*\* (.+)/);
      const keyMatch = block.match(/\*\*Key Details:\*\* (.+)/);
      const humanMatch = block.match(/## (.+)/);

      if (summaryMatch) {
        entries.push({
          timestamp: new Date().toISOString(),
          role: 'agent',
          summary: summaryMatch[1],
          keyDetails: keyMatch ? keyMatch[1].split(', ') : [],
        });
      }
    }

    return entries;
  }
}

export const workingBuffer = new WorkingBuffer();
```

### Autonomous Crons

**Key Insight:** Distinguish between crons that **prompt** vs crons that **do**.

| Type | Use When | Amplify Example |
|------|----------|-----------------|
| `systemEvent` | Interactive tasks needing user attention | "New follower — want to review?" |
| `isolated agentTurn` | Background maintenance, data sync | Nightly stage analytics refresh |

```typescript
// Example: Autonomous cron for Amplify
interface AmplifyCronJob {
  name: string;
  schedule: string;  // cron format
  type: 'systemEvent' | 'isolated agentTurn';
  handler: () => Promise<void>;
}

const CRON_JOBS: AmplifyCronJob[] = [
  {
    name: 'stage-discovery-refresh',
    schedule: '*/15 * * * *',  // Every 15 minutes
    type: 'isolated agentTurn',
    handler: async () => {
      // Check for new stages in user's area
      // Update local cache
      // Push notification if high-priority new stage
    },
  },
  {
    name: 'track-analysis-queue',
    schedule: '*/5 * * * *',
    type: 'isolated agentTurn',
    handler: async () => {
      // Process pending track analysis queue
      // Run Ollama analysis on new uploads
    },
  },
  {
    name: 'social-nudge',
    schedule: '0 9 * * *',  // 9 AM daily
    type: 'systemEvent',
    handler: async () => {
      // "5 friends are performing nearby this weekend"
      // Requires main session for reply
    },
  },
  {
    name: 'analytics-digest',
    schedule: '0 8 * * 1',  // Monday 8 AM
    type: 'isolated agentTurn',
    handler: async () => {
      // Generate weekly analytics digest
      // Store in DB for dashboard
    },
  },
];
```

### Self-Improvement Loops

```typescript
// src/lib/self-improvement.ts
interface LearningEntry {
  timestamp: string;
  trigger: 'error' | 'correction' | 'discovery' | 'pattern';
  description: string;
  adjustment: string;
  verified: boolean;
}

class SelfImprovementLoop {
  private learningsPath: string;

  constructor(learningsPath: string = './memory/learnings.jsonl') {
    this.learningsPath = learningsPath;
  }

  async record(entry: Omit<LearningEntry, 'timestamp' | 'verified'>): Promise<void> {
    const full: LearningEntry = { ...entry, timestamp: new Date().toISOString(), verified: false };
    await writeFile(this.learningsPath, JSON.stringify(full) + '\n', { flag: 'a' });
  }

  async getRecentPatterns(sinceDays: number = 7): Promise<LearningEntry[]> {
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
    const entries = await this.getAllEntries();
    return entries.filter(e => new Date(e.timestamp) >= since && e.verified);
  }

  async suggestOptimizations(): Promise<string[]> {
    const patterns = await this.getRecentPatterns();
    const suggestions: string[] = [];

    // Detect repeated failures
    const failures = patterns.filter(p => p.trigger === 'error');
    const byType = this.groupBy(failures, 'description');
    for (const [type, items] of Object.entries(byType)) {
      if (items.length >= 3) {
        suggestions.push(` recurring_error:${type} - Consider proactive handling`);
      }
    }

    // Detect user corrections
    const corrections = patterns.filter(p => p.trigger === 'correction');
    for (const c of corrections) {
      suggestions.push(` correction:${c.adjustment}`);
    }

    return suggestions;
  }

  private async getAllEntries(): Promise<LearningEntry[]> {
    try {
      const data = await readFile(this.learningsPath, 'utf-8');
      return data.split('\n').filter(Boolean).map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }

  private groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
    return arr.reduce((acc, item) => {
      const val = String(item[key]);
      (acc[val] = acc[val] || []).push(item);
      return acc;
    }, {} as Record<string, T[]>);
  }
}

export const selfImprovement = new SelfImprovementLoop();
```

### Amplify-Specific Proactive Patterns

```typescript
// src/lib/amplify-proactive.ts

// 1. STAGE DISCOVERY PROACTIVE CHECK
async function proactiveStageDiscovery(userId: string, location: { lat: number; lng: number }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.preferences) return;

  const preferences = JSON.parse(user.preferences);
  const newStages = await prisma.stage.findMany({
    where: {
      status: 'APPROVED',
      genre: { in: preferences.genres || [] },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },  // Last 24h
    },
  });

  if (newStages.length > 0) {
    // Push notification or queue for user
    await queueNotification(userId, {
      type: 'NEW_STAGES_NEARBY',
      stages: newStages.slice(0, 3),
      message: `${newStages.length} new ${preferences.genres?.join(', ')} stages near you!`,
    });
  }
}

// 2. TRACK ANALYSIS QUEUE PROCESSOR
async function processTrackAnalysisQueue() {
  const pending = await prisma.track.findMany({
    where: { status: 'PROCESSING' },
    take: 5,
  });

  for (const track of pending) {
    try {
      // Extract audio features (use existing AudioEngine logic)
      const features = await extractAudioFeatures(track.audioUrl);

      // Generate Ollama analysis
      const prompt = `Analyze: BPM=${features.bpm}, Key=${features.key}, Mood=${features.mood}`;
      const suggestion = await ollama.generate({ model: 'llama3.2', prompt });

      await prisma.track.update({
        where: { id: track.id },
        data: {
          status: 'READY',
          analysis: JSON.stringify({ ...features, suggestion }),
        },
      });
    } catch (error) {
      await prisma.track.update({
        where: { id: track.id },
        data: { status: 'ERROR' },
      });
    }
  }
}

// 3. SOCIAL ENGAGEMENT NUDGE
async function socialEngagementCheck() {
  const activeStages = await prisma.stage.findMany({
    where: {
      status: 'APPROVED',
      visitCount: { gt: 10 },
    },
    include: { musician: true },
  });

  for (const stage of activeStages) {
    const recentActivity = await prisma.stageVisit.count({
      where: {
        stageId: stage.id,
        visitedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    if (recentActivity > 20) {
      // Notify musician of viral potential
      await queueNotification(stage.musicianId, {
        type: 'TRENDING_STAGE',
        message: `Your stage "${stage.name}" is trending! ${recentActivity} visits this week.`,
      });
    }
  }
}
```

### Pros/Cons: Proactive-Agent Workflow

| Pros | Cons |
|------|------|
| ✅ Anticipates user needs before expressed | ❌ Risk of unwanted automation |
| ✅ Continuous operation without prompting | ❌ Potential for context bloat |
| ✅ Learns and improves over time | ❌ Requires careful guardrails |
| ✅ Handles background tasks efficiently | ❌ Harder to debug "why did it do that?" |
| ✅ Compaction survival via WAL/Buffer | ❌ Complexity increases maintenance |
| ✅ Cross-session continuity | ❌ Privacy implications of persistent state |

---

## 4. Architecture Diagrams

### Combined AI Architecture for Amplify

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AMPLIFY APP                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      REACT FRONTEND (Next.js)                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │   │
│  │  │   AR    │  │  Stage   │  │  Track   │  │   Social/Tribes     │  │   │
│  │  │  Canvas │  │ Discovery│  │ Analysis │  │                     │  │   │
│  │  └────┬────┘  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘  │   │
│  └───────┼───────────┼─────────────┼────────────────────┼───────────────┘   │
│          │           │             │                    │                  │
│          ▼           ▼             ▼                    ▼                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    AI CLIENT LAYER (src/lib/)                       │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │   │
│  │  │  Ollama Client  │  │ Anthropic Client│  │   AI Fallback Mgr   │  │   │
│  │  │  (local LLMs)   │  │ (cloud: Opus)   │  │                     │  │   │
│  │  └────────┬────────┘  └────────┬────────┘  └──────────┬─────────┘  │   │
│  └───────────┼─────────────────────┼──────────────────────┼─────────────┘   │
│              │                     │                      │                 │
│              ▼                     ▼                      ▼                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MCP SERVER LAYER                                 │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │   Stages   │  │   Tracks    │  │   Social    │  │   Analytics │  │   │
│  │  │   Tools    │  │   Tools     │  │   Tools     │  │   Tools     │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
└──────────────────────────────────────┼───────────────────────────────────────┘
                                       │
           ┌────────────────────────────┼────────────────────────────┐
           │                            │                            │
           ▼                            ▼                            ▼
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│     OLLAMA LOCAL     │  │   AMPLIFY MCP        │  │    PRISMA DB         │
│  ┌────────────────┐  │  │    SERVER            │  │  ┌────────────────┐  │
│  │  llama3.2      │  │  │  ┌────────────────┐  │  │  │  Stages       │  │
│  │  nomic-embed   │  │  │  │ SSE Transport  │  │  │  │  Tracks       │  │
│  │                │  │  │  │ Tool Handlers │  │  │  │  Users        │  │
│  │  Port: 11434   │  │  │  │ Resource Mgr   │  │  │  │  Tribes       │  │
│  └────────────────┘  │  │  └────────────────┘  │  │  │  Analytics    │  │
│                      │  │     Port: 3001        │  │  └────────────────┘  │
│                      │  └──────────────────────┘  │                      │
└──────────────────────┘  └────────────────────────┘  └──────────────────────┘
```

### Proactive Agent Loop

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PROACTIVE AGENT LOOP                                  │
│                                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌───────┐ │
│  │ OBSERVE  │───▶│  THINK   │───▶│  PLAN    │───▶│  ACT     │───▶│LEARN  │ │
│  │          │    │          │    │          │    │          │    │       │ │
│  │-User GPS │    │-New stage│    │-Analyze  │    │-Push notif│   │-Log   │ │
│  │-Track up │    │ nearby?  │    │ options  │    │-Pre-cach │    │-Update│ │
│  │-Social   │    │-Low eng? │    │-Priority │    │-Suggest  │    │-Adapt │ │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘    └───────┘ │
│       │                                                           │         │
│       │           ┌─────────────────────────────────────┐        │         │
│       └──────────▶│         WAL PROTOCOL               │◀───────┘         │
│                   │  ┌────────────────────────────────┐ │                    │
│                   │  │  Write BEFORE responding       │ │                    │
│                   │  │  - Corrections → WAL           │ │                    │
│                   │  │  - Decisions → WAL            │ │                    │
│                   │  │  - Preferences → WAL          │ │                    │
│                   │  └────────────────────────────────┘ │                    │
│                   └─────────────────────────────────────┘                    │
│                                                                              │
│       ┌────────────────────────────────────────────────────────────────┐    │
│       │                    WORKING BUFFER                               │    │
│       │  Activates at 60% context. Captures every exchange.          │    │
│       │  Survives compaction. Recovered on session start.            │    │
│       └────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         AUTONOMOUS CRONS                               │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │ │
│  │  │ Stage Disc │  │ Track Anlys │  │ Social Nudge│  │ Analytics  │    │ │
│  │  │ @*/15 min  │  │ @*/5 min    │  │ @9 AM daily │  │ @Mon 8 AM   │    │ │
│  │  │ (isolated) │  │ (isolated)  │  │ (sysEvent)  │  │ (isolated)  │    │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow: Track Analysis Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TRACK ANALYSIS FLOW                                   │
│                                                                              │
│  Musician uploads ──▶ Prisma (status: PROCESSING) ──▶ MCP Track Analyzer   │
│       track               ┌────────────────┐              │                  │
│                            │                │              ▼                  │
│                            │     ┌─────────▼─────────┐                    │
│                            │     │  Ollama (local)   │                    │
│                            │     │  llama3.2         │                    │
│                            │     │  - BPM extraction │                    │
│                            │     │  - Mood analysis  │                    │
│                            │     │  - AR suggestion  │                    │
│                            │     └───────────────────┘                    │
│                            │                │                              │
│                            │                ▼                              │
│                            │     ┌─────────────────┐                       │
│                            │     │ Embedding Gen   │                       │
│                            │     │ (nomic-embed)   │                       │
│                            │     └────────┬────────┘                       │
│                            │              │                                │
│                            └──────────────┼────────────────────────────────┘
│                                           │                                 │
│                                           ▼                                 │
│                            ┌────────────────────────────────┐              │
│                            │  Update Track: status=READY    │              │
│                            │  - analysis JSON stored        │              │
│                            │  - embedding vector indexed    │              │
│                            └────────────────────────────────┘              │
│                                           │                                 │
│                                           ▼                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        AVAILABLE VIA MCP                              │ │
│  │   • get_nearby_stages → stage.arSuggestions = analyze(track)          │ │
│  │   • suggest_visualization → returns VisualizationType enum            │ │
│  │   • analyze_track → full analysis + social metadata                  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Recommendations for Amplify

### Use Case Fit Analysis

| Feature | Ollama Fit | MCP Fit | Proactive Fit | Priority |
|---------|-----------|---------|----------------|----------|
| **Stage Discovery** | ✅ Local NLP for filtering | ✅ Tools for DB queries | ✅ Auto-refresh cache | **P0** |
| **Track Analysis** | ✅ Great for generation | ✅ Pipeline tool | ✅ Queue processor | **P0** |
| **AR Suggestions** | ✅ Good local inference | ✅ Embed in analysis | ✅ Real-time suggestions | **P1** |
| **Social Features** | ✅ Tribe matching | ✅ Social graph tools | ✅ Nudge system | **P2** |
| **Musician AI Studio** | ✅ Heavy local use | ✅ Tool integration | ✅ Proactive insights | **P1** |

### Recommended Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    RECOMMENDED AMPLIFY STACK                      │
│                                                                   │
│   TIER 1 (MVP - Months 1-2)                                      │
│   ├── Ollama for local inference (chat, suggestions)              │
│   ├── Anthropic Claude for complex analysis (fallback)            │
│   └── Basic tool functions in API routes                          │
│                                                                   │
│   TIER 2 (Enhanced - Months 3-4)                                  │
│   ├── MCP Server for structured tool access                       │
│   ├── Working Buffer for session continuity                       │
│   └── Proactive stage discovery cron                              │
│                                                                   │
│   TIER 3 (Pro - Months 5-6)                                      │
│   ├── WAL Protocol for corrections/preferences                    │
│   ├── Self-improvement loop with learnings                       │
│   └── Full autonomous agent for musician dashboard                │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Specific Recommendations

**1. Stage Discovery (P0)**
- Use Ollama + embeddings for semantic search of stage descriptions
- MCP tool `discover_stages` with H3 geospatial indexing
- Proactive cron refreshes nearby stages every 15 min

**2. Track Analysis (P0)**
- Ollama for mood/tempo analysis (avoid cloud costs)
- Store embeddings in vector field (Prisma JSON or separate Qdrant)
- MCP tool `analyze_track` handles full pipeline

**3. AR Visualization Suggestions (P1)**
- Ollama generates visualization configs from audio features
- MCP tool `suggest_visualization` returns typed VisualizationType
- Consider fine-tuning a small model (3B) on AR preferences

**4. Social/Tribes (P2)**
- Ollama for matching users to tribes semantically
- MCP tools for social graph queries
- Proactive nudge for friend activity (requires systemEvent)

**5. Musician AI Studio (P1)**
- Heavy Ollama usage (uncapped local inference)
- MCP for track/analytics tools
- Isolated agentTurn for batch processing

### Key Trade-offs

| Decision | Recommended | Alternative | Why |
|----------|------------|--------------|-----|
| Primary Inference | **Ollama (local)** | Cloud Anthropic | Cost, privacy, offline |
| Fallback | **Anthropic Claude** | OpenAI | Amplify already uses it |
| Tool Protocol | **MCP** | Custom REST | Standardized, extensible |
| Proactive Engine | **Custom + WAL** | LangGraph/LlamaIndex | Specific Amplify needs |
| Embeddings | **nomic-embed-text** | OpenAI | Local, free, good quality |

---

## 6. Implementation Priority & Sequence

### Phase 1: Foundation (Week 1-2)

**Goal:** Get Ollama working in Amplify with basic fallback.

```
Tasks:
1. Set up Ollama server with startup script
2. Create Ollama client singleton (src/lib/ollama.ts)
3. Add health check endpoint (/api/health/ollama)
4. Implement fallback to Anthropic
5. Basic streaming chat UI component
```

**Files to Create:**
- `src/lib/ollama.ts` — Client
- `src/lib/ai-client.ts` — Fallback manager
- `src/hooks/useOllamaChat.ts` — React hook
- `src/app/api/ai/chat/route.ts` — SSE streaming endpoint

**Files to Modify:**
- `src/middleware.ts` — Route protection
- `.env.local` — Add OLLAMA_* vars
- `CLAUDE.md` — Document Ollama setup

### Phase 2: MCP Server (Week 3-4)

**Goal:** Structured tool access via MCP.

```
Tasks:
1. Set up MCP server project (separate from main Next.js)
2. Implement Stage tools (discover, get, analytics)
3. Implement Track tools (analyze, suggest, search)
4. Add SSE transport for web clients
5. Connect MCP tools to Ollama for generation
```

**Files to Create:**
- `amplify-mcp-server/src/index.ts`
- `amplify-mcp-server/src/tools/stages.ts`
- `amplify-mcp-server/src/tools/tracks.ts`
- `amplify-mcp-server/src/resources/amplify.ts`

**Integration:**
- MCP Server runs on port 3001
- Main app connects via SSE or stdio
- Tools are Ollama prompts + Prisma queries

### Phase 3: Proactive Engine (Week 5-6)

**Goal:** Background intelligence without user prompting.

```
Tasks:
1. Implement WAL Protocol for session state
2. Set up Working Buffer for compaction survival
3. Create autonomous cron jobs:
   - Stage discovery refresh (15 min)
   - Track analysis queue (5 min)
   - Social nudges (daily)
4. Self-improvement logging system
5. Dashboard for proactive insights
```

**Files to Create:**
- `src/lib/wal.ts` — WAL Protocol
- `src/lib/working-buffer.ts` — Buffer system
- `src/lib/amplify-proactive.ts` — Proactive patterns
- `src/lib/self-improvement.ts` — Learning system
- `src/app/api/cron/discover/route.ts` — Cron endpoint
- `src/app/api/cron/analyze/route.ts` — Queue processor

**Files to Modify:**
- `src/lib/ollama.ts` — Add embedding support
- `prisma/schema.prisma` — Add analysis/embedding fields

### Phase 4: Integration & Polish (Week 7-8)

**Goal:** Tie everything together with good UX.

```
Tasks:
1. AI Studio dashboard for musicians
2. Track analysis UI with visualization preview
3. Stage discovery with AI recommendations
4. Push notification integration for proactive alerts
5. Offline mode with Ollama
```

**Files to Create:**
- `src/app/(musician)/musician/ai-studio/` — Full AI dashboard
- `src/components/ai/TrackAnalyzer.tsx`
- `src/components/ai/StageRecommender.tsx`
- `src/components/ai/ProactiveInsights.tsx`

---

### Resource Requirements

| Phase | Ollama VRAM | Storage | CPU | Notes |
|-------|-------------|---------|-----|-------|
| Phase 1 | 4-6 GB | 3 GB | 4 cores | llama3.2 + embeddings |
| Phase 2 | 4-6 GB | 3 GB | 4 cores | Same as Phase 1 |
| Phase 3 | 4-6 GB | 3 GB | 4 cores | Add analysis models |
| Phase 4 | 6-8 GB | 5 GB | 8 cores | Consider quantized models |

### Testing Strategy

```typescript
// src/__tests__/ai/
describe('Ollama Integration', () => {
  test('health check returns ok', async () => {
    const health = await ollama.healthCheck();
    expect(health.ok).toBe(true);
  });

  test('streaming response works', async () => {
    const chunks: string[] = [];
    for await (const chunk of ollama.stream({ model: 'llama3.2', prompt: 'Hi' })) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(0);
  });
});

describe('MCP Tools', () => {
  test('discover_stages returns results', async () => {
    const result = await mcpClient.callTool('discover_stages', {
      latitude: 40.7128,
      longitude: -74.0060,
    });
    expect(JSON.parse(result.text)).toBeInstanceOf(Array);
  });
});

describe('Proactive Engine', () => {
  test('WAL captures corrections', () => {
    const shouldCapture = amplifyWAL.shouldCapture('Use blue, not red');
    expect(shouldCapture).toBe(true);
  });

  test('Working buffer activates at 60%', async () => {
    await workingBuffer.checkContext(60);
    expect(await workingBuffer.isActive()).toBe(true);
  });
});
```

---

## Summary

| Technology | Best For | Integration Effort | Amplify Fit |
|------------|----------|-------------------|-------------|
| **Ollama** | Local inference, cost savings, privacy | Medium | ⭐⭐⭐⭐⭐ |
| **MCP Servers** | Structured tool access, AI extensibility | Medium-High | ⭐⭐⭐⭐ |
| **Proactive Agent** | Background intelligence, user anticipation | High | ⭐⭐⭐⭐ |

### Quick Wins (Week 1)
1. Set up Ollama with `llama3.2` + `nomic-embed-text`
2. Create fallback client that tries Ollama → Claude
3. Add `/api/ai/chat` streaming endpoint with SSE
4. Build simple chat component in AI Studio

### Strategic Wins (Weeks 2-4)
1. MCP server with Stage/Track tools
2. Embeddings for semantic search
3. Track analysis pipeline with Ollama
4. Proactive stage discovery cron

### Long-term (Months 2-3)
1. WAL + Working Buffer for session survival
2. Self-improvement loop with learnings
3. Fine-tuned model for AR suggestions
4. Full autonomous agent for musician dashboard

---

## Appendix: OpenClaw Integration for Amplify

### OpenClaw Gateway Architecture

OpenClaw provides a WebSocket-based gateway that connects multiple chat channels (WhatsApp, Telegram, Discord, etc.) to AI agents. Key components:

```
┌──────────────────────────────────────────────────────────────────────┐
│                        OPENCLAW GATEWAY                               │
│                                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  WhatsApp  │  │  Telegram  │  │  Discord   │  │  WebChat   │  │
│  │  (Baileys) │  │   (grammY)  │  │            │  │            │  │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘  │
│         │               │               │               │           │
│         └───────────────┴───────────────┴───────────────┘           │
│                              │                                        │
│                              ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    WebSocket Gateway (port 18789)                 │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                │ │
│  │  │   Agents   │  │   Cron     │  │   Tools    │                │ │
│  │  │  (sessions)│  │  (system)  │  │  (exec)    │                │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                              │                                        │
│                              ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │              Model Providers (Ollama, Anthropic, OpenAI)          │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### Amplify + OpenClaw Synergy

| Amplify Feature | OpenClaw Integration | Benefit |
|----------------|---------------------|---------|
| **Stage Discovery** | OpenClaw cron job every 15 min | Autonomous refresh |
| **Track Analysis** | Ollama local inference | Zero cloud cost |
| **Musician Notifications** | OpenClaw channel routing | Multi-platform alerts |
| **Social Features** | MCP servers for graph queries | Structured data access |
| **AI Studio** | OpenClaw agent sessions | Persistent context |

### OpenClaw Cron Integration for Amplify

```typescript
// OpenClaw cron format (configured in openclaw.json)
{
  "crons": [
    {
      "name": "amplify-stage-refresh",
      "schedule": "*/15 * * * *",
      "session": "isolated",  // or "main" for systemEvent
      "message": "AUTONOMOUS: Check for new approved stages near user locations. Push notifications for matches."
    },
    {
      "name": "amplify-track-analysis",
      "schedule": "*/5 * * * *",
      "session": "isolated",
      "message": "AUTONOMOUS: Process pending tracks in analysis queue. Run Ollama inference."
    }
  ]
}
```

**Key OpenClaw Cron Patterns:**

| Pattern | Use Case | Amplify Example |
|---------|----------|-----------------|
| `session: "isolated"` | Background processing | Stage cache refresh, track analysis queue |
| `session: "main"` | Interactive notifications | "3 friends performing nearby" |
| `systemEvent` | Gateway-level events | Session start/end triggers |

### MCP Server Connection to OpenClaw

OpenClaw supports per-gateway MCP server configuration. Amplify could provide MCP tools:

```json
// OpenClaw gateway config
{
  "mcpServers": {
    "amplify": {
      "command": "node",
      "args": ["/path/to/amplify-mcp-server/dist/index.js"],
      "env": {
        "DATABASE_URL": "file:./dev.db"
      }
    }
  }
}
```

### Ollama as OpenClaw Model Provider

```json
// openclaw.json model provider config
{
  "modelProviders": {
    "ollama": {
      "provider": "openai",
      "baseURL": "http://localhost:11434/v1",
      "apiKey": "ollama",  // dummy key for local
      "models": ["llama3.2", "nomic-embed-text"]
    }
  }
}
```

### Amplify as OpenClaw Skill

Create an Amplify skill for OpenClaw agents:

```
~/.openclaw/skills/amplify/
├── SKILL.md
├── scripts/
│   ├── stage-discovery.ts
│   ├── track-analysis.ts
│   └── social-nudge.ts
└── references/
    └── amplify-api.md
```

**Skill trigger pattern:**
- Agent asks "What's happening near me musically?"
- Skill reads GPS, queries Amplify MCP tools
- Returns formatted stage discovery results

---

## Additional Reference: Ollama Performance Benchmarks

| Model | Size | Tokens/sec (M1 Pro) | Tokens/sec (RTX 3080) | Best For |
|-------|------|--------------------|-----------------------|----------|
| `llama3.2:3b` | 2GB | ~25 | ~40 | Fast mobile inference |
| `llama3.2` | 4GB | ~15 | ~30 | Balanced chat |
| `mistral:7b` | 4GB | ~12 | ~25 | High-quality generation |
| `codellama:7b` | 4GB | ~10 | ~22 | Code-heavy tasks |
| `nomic-embed-text` | 274MB | ~500 emb/s | ~800 emb/s | Semantic search |

**Memory Requirements (total):**
- Minimum (mobile): 4GB VRAM — llama3.2:3b + nomic-embed-text
- Recommended: 8GB VRAM — llama3.2 + mistral:7b + embeddings
- Optimal: 12GB+ VRAM — Full model suite with concurrent users

---

## Quick Reference: Implementation Checklist

### Week 1: Ollama Foundation
- [ ] Install Ollama and pull models
- [ ] Create `src/lib/ollama.ts` client
- [ ] Add fallback to Anthropic
- [ ] Basic streaming chat endpoint

### Week 2: API Integration
- [ ] `/api/ai/chat/stream` with SSE
- [ ] `/api/ai/analyze` with Ollama
- [ ] Update existing Claude routes with fallback
- [ ] Add health check endpoint

### Week 3-4: MCP Server
- [ ] Initialize MCP server project
- [ ] Implement stage discovery tools
- [ ] Implement track analysis tools
- [ ] Connect via SSE transport

### Week 5-6: Proactive Engine
- [ ] WAL Protocol implementation
- [ ] Working Buffer setup
- [ ] Autonomous cron jobs
- [ ] Self-improvement logging

### Week 7-8: Integration & Polish
- [ ] AI Studio dashboard
- [ ] Push notification integration
- [ ] Offline mode testing
- [ ] Performance optimization

---

*Document created: 2026-03-21*  
*Updated: 2026-03-21 (with OpenClaw integration appendix)*  
*Focus: AI Research Agent Architecture for TylerGarlick/amplify*  
*Musician AR App with Stage Discovery, Track Analysis, and Social Features*
