import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { claude } from "@/lib/claude";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { messages, context } = body;
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    const contextStr = context ? JSON.stringify(context) : "";
    const systemPrompt = `You are a helpful assistant for Amplify, an AR music performance platform. You help musicians design immersive AR experiences — visualizations, stages, and audio-reactive effects.${contextStr ? " Context: " + contextStr : ""}

Available visualization types: PARTICLE_SYSTEM, GEOMETRY_PULSE, WAVEFORM_RIBBON, FREQUENCY_BARS, SHADER_EFFECT, GLTF_ANIMATOR, LIGHT_SHOW. Be creative and specific in your recommendations.`;

    const stream = claude.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            const chunk = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`;
            controller.enqueue(encoder.encode(chunk));
          }
          if (event.type === "message_stop") {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[POST /api/ai/chat]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
