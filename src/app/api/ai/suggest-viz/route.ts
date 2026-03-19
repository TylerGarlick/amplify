import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { suggestVisualizations } from "@/lib/suggestViz";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const trackId = searchParams.get("track_id");

    if (!trackId) return NextResponse.json({ error: "track_id is required" }, { status: 400 });

    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { musician: true },
    });

    if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });

    const energy = track.energy;
    const tempo = track.bpm;
    const emotionTags: string[] = track.aiMoodTags
      ? (JSON.parse(track.aiMoodTags) as string[])
      : [];
    const emotion = emotionTags.length > 0 ? emotionTags.join(", ") : null;
    const genreTags: string[] = []; // Genre tags can be added to Track model later

    const suggestions = suggestVisualizations(energy, tempo, emotion, genreTags);

    return NextResponse.json({
      data: {
        trackId,
        suggestions,
      },
    });
  } catch (err) {
    console.error("[GET /api/ai/suggest-viz]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
