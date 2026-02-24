import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { haversine } from "@/lib/geo";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get("lat") ?? "");
    const lng = parseFloat(searchParams.get("lng") ?? "");
    const radius = parseFloat(searchParams.get("radius") ?? "500");
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: "lat and lng query params are required" }, { status: 400 });
    }
    const allStages = await prisma.stage.findMany({
      where: { isActive: true, isPublic: true },
      include: {
        musician: { select: { displayName: true, avatarUrl: true } },
        visualizations: { orderBy: { sortOrder: "asc" } },
        stageTrackLinks: { orderBy: { sortOrder: "asc" }, take: 1, include: { track: true } },
      },
    });
    const nearby = allStages
      .filter((stage) => haversine(lat, lng, stage.latitude, stage.longitude) <= radius)
      .map((stage) => ({
        ...stage,
        visualizations: stage.visualizations.map((v) => ({ ...v, config: JSON.parse(v.configJson) })),
        activeTrack: stage.stageTrackLinks[0]?.track ?? null,
        distance: haversine(lat, lng, stage.latitude, stage.longitude),
      }));
    return NextResponse.json({ data: nearby });
  } catch (err) {
    console.error("[GET /api/ar/nearby]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
