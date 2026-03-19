import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeTrack } from "@/lib/analysis/trackAnalyzer";

/**
 * POST /api/ai/analyze
 * Analyze a track: extract tempo, key, energy, emotion, genre tags.
 * Requires: MUSICIAN or ADMIN role.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session.user as { role?: string; id?: string };
    if (user.role !== "MUSICIAN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { trackId } = await request.json();
    if (!trackId) {
      return NextResponse.json({ error: "trackId is required" }, { status: 400 });
    }

    const track = await prisma.track.findUnique({
      where: { id: trackId },
      include: { musician: true },
    });
    if (!track) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    // Only owner or admin can analyze
    if (user.role !== "ADMIN" && track.musician.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Run AI analysis
    const analysis = await analyzeTrack({
      trackId: track.id,
      title: track.title,
      artist: track.artist,
      fileUrl: track.fileUrl,
      existingBpm: track.bpm,
      existingKey: track.key,
      existingEnergy: track.energy,
    });

    // Persist results to database
    const updatedTrack = await prisma.track.update({
      where: { id: trackId },
      data: {
        bpm: analysis.tempo,
        key: analysis.key,
        energy: analysis.energy,
        aiDescription: analysis.aiDescription,
        aiMoodTags: JSON.stringify([analysis.emotion, ...analysis.genreTags]),
        analysisJson: JSON.stringify({
          tempo: analysis.tempo,
          key: analysis.key,
          energy: analysis.energy,
          emotion: analysis.emotion,
          genreTags: analysis.genreTags,
          analyzedAt: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      data: {
        trackId: updatedTrack.id,
        tempo: analysis.tempo,
        key: analysis.key,
        energy: analysis.energy,
        emotion: analysis.emotion,
        genreTags: analysis.genreTags,
        aiDescription: analysis.aiDescription,
        analyzedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[POST /api/ai/analyze]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
