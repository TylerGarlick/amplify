import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = session.user as { id?: string; role?: string };
    if (!user.id) return NextResponse.json({ error: "Invalid session" }, { status: 400 });

    // Get user's tribe memberships
    const tribeMemberships = await prisma.tribeMember.findMany({
      where: { userId: user.id },
      include: {
        tribe: true,
      },
      orderBy: { joinedAt: "desc" },
    });

    // Get user's watch sessions (for listening history and stats)
    const watchSessions = await prisma.locationWatch.findMany({
      where: { userId: user.id, counted: true },
      include: {
        stage: {
          include: {
            musician: { select: { displayName: true } },
            stageTrackLinks: {
              include: { track: true },
              take: 1,
            },
          },
        },
        territory: {
          include: { owningTribe: true },
        },
      },
      orderBy: { lastWatched: "desc" },
      take: 20, // Recent 20 listening sessions
    });

    // Get unique stages visited
    const visitedStageIds = [...new Set(watchSessions.map((ws) => ws.stageId))];
    const visitedStages = await prisma.stage.findMany({
      where: { id: { in: visitedStageIds } },
      include: {
        musician: { select: { displayName: true } },
        stageTrackLinks: {
          include: { track: true },
          take: 1,
        },
        territory: { include: { owningTribe: true } },
      },
    });

    // Calculate total listening time (sum of watchTimeSeconds)
    const totalListeningSeconds = watchSessions.reduce((sum, ws) => sum + ws.watchTimeSeconds, 0);

    // Get playlists count (user's own tracks as a playlist)
    const playlistsCount = 1; // Placeholder - could be expanded with a Playlist model

    // Get musician data if applicable
    let musicianData = null;
    if (user.role === "MUSICIAN" || user.role === "ADMIN") {
      musicianData = await prisma.musician.findUnique({
        where: { userId: user.id },
        include: {
          tracks: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          stages: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });
    }

    return NextResponse.json({
      data: {
        playlistsCount,
        listeningHours: Math.round((totalListeningSeconds / 3600) * 10) / 10,
        stagesVisited: visitedStages.length,
        tribeMemberships: tribeMemberships.map((tm) => ({
          id: tm.id,
          role: tm.role,
          joinedAt: tm.joinedAt,
          tribe: tm.tribe,
        })),
        recentHistory: watchSessions.slice(0, 10).map((ws) => ({
          id: ws.id,
          watchTimeSeconds: ws.watchTimeSeconds,
          lastWatched: ws.lastWatched,
          stage: ws.stage,
          tribe: ws.territory.owningTribe,
        })),
        visitedStages: visitedStages.map((stage) => ({
          id: stage.id,
          name: stage.name,
          description: stage.description,
          latitude: stage.latitude,
          longitude: stage.longitude,
          musician: stage.musician,
          track: stage.stageTrackLinks[0]?.track ?? null,
          owningTribe: stage.territory?.owningTribe ?? null,
          lastVisited: watchSessions.find((ws) => ws.stageId === stage.id)?.lastWatched ?? null,
        })),
        musicianData,
      },
    });
  } catch (err) {
    console.error("[GET /api/profile]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
