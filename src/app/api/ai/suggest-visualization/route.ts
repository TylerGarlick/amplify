import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { claude } from "@/lib/claude";

const VIZ_TYPES = ["PARTICLE_SYSTEM", "GEOMETRY_PULSE", "WAVEFORM_RIBBON", "FREQUENCY_BARS", "SHADER_EFFECT", "GLTF_ANIMATOR", "LIGHT_SHOW"];

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as { role?: string; id?: string };
    if (user.role !== "MUSICIAN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();
    const { prompt, type, trackMetadata } = body;
    if (!prompt || !type) return NextResponse.json({ error: "prompt and type are required" }, { status: 400 });
    if (!VIZ_TYPES.includes(type)) return NextResponse.json({ error: "Invalid visualization type" }, { status: 400 });
    const metaStr = trackMetadata ? JSON.stringify(trackMetadata) : "No track metadata provided.";
    const response = await claude.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: `You are an expert AR visualization designer for a music performance app called Amplify. The visualization type is ${type}. Respond ONLY with a valid JSON object for the configJson field. No explanation, no markdown, just the JSON.`,
      messages: [{ role: "user", content: `Generate configJson for a ${type} AR visualization. Description: ${prompt}. Track metadata: ${metaStr}` }],
    });
    const rawText = response.content[0].type === "text" ? response.content[0].text : "{}";
    let configJson = rawText.trim();
    const fenceMatch = configJson.match(/```(?:json)?\n?([\s\S]*?)```/);
    if (fenceMatch) configJson = fenceMatch[1].trim();
    JSON.parse(configJson);
    return NextResponse.json({ data: { configJson } });
  } catch (err) {
    console.error("[POST /api/ai/suggest-visualization]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
