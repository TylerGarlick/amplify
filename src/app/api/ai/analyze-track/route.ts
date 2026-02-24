import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { claude } from "@/lib/claude";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as { role?: string; id?: string };
    if (user.role !== "MUSICIAN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { trackId } = await request.json();
    if (!trackId) return NextResponse.json({ error: "trackId is required" }, { status: 400 });
    const track = await prisma.track.findUnique({ where: { id: trackId }, include: { musician: true } });
    if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });
    if (user.role !== "ADMIN" && track.musician.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const response = await claude.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 512,
      system: "You are a music analysis expert. Analyze track metadata and return JSON: { \"description\": string, \"moodTags\": string[] }. No markdown.",
      messages: [{ role: "user", content: `Analyze: Title="${track.title}", Artist="${track.artist}", BPM=${track.bpm ?? "unknown"}, Key=${track.key ?? "unknown"}, Energy=${track.energy ?? "unknown"}. Return JSON.` }],
    });
    const rawText = response.content[0].type === "text" ? response.content[0].text : "{}";
    let parsed = { description: "", moodTags: [] as string[] };
    try { parsed = JSON.parse(rawText); } catch { /* use defaults */ }
    await prisma.track.update({ where: { id: trackId }, data: { aiDescription: parsed.description, aiMoodTags: JSON.stringify(parsed.moodTags) } });
    return NextResponse.json({ data: { aiDescription: parsed.description, aiMoodTags: parsed.moodTags } });
  } catch (err) {
    console.error("[POST /api/ai/analyze-track]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
