import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Haversine formula to calculate distance between two GPS points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latitude = searchParams.get("latitude");
    const longitude = searchParams.get("longitude");
    const radius = searchParams.get("radius"); // filter radius in meters
    const musicianId = searchParams.get("musicianId");

    const session = await auth();

    // Build base query based on auth status
    let where: Record<string, unknown> = {};
    let include: Record<string, unknown> = { musician: { select: { displayName: true } } };

    if (!session) {
      // Public access: only show active public stages
      where = { isActive: true, isPublic: true };
    } else {
      const user = session.user as { role?: string; id?: string };
      if (user.role === "ADMIN") {
        // Admin sees all stages
        include = { musician: { select: { displayName: true } } };
      } else {
        // Musicians see their own stages with full details
        const musician = await prisma.musician.findUnique({ where: { userId: user.id } });
        if (!musician) return NextResponse.json({ data: [] });
        where = { musicianId: musician.id };
        include = {
          visualizations: true,
          stageTrackLinks: { include: { track: true } },
        };
      }
    }

    // Filter by musician
    if (musicianId) {
      where = { ...where, musicianId };
    }

    let stages = await prisma.stage.findMany({
      where,
      include: {
        musician: { select: { displayName: true } },
        visualizations: true,
        stageTrackLinks: include.stageTrackLinks ? { include: { track: true } } : undefined,
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter by location if coordinates provided
    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const filterRadius = radius ? parseFloat(radius) : 50000; // default 50km

      stages = stages
        .map((stage) => ({
          ...stage,
          distance: calculateDistance(lat, lng, stage.latitude, stage.longitude),
        }))
        .filter((stage) => stage.distance <= filterRadius)
        .sort((a, b) => a.distance - b.distance);
    }

    return NextResponse.json({ data: stages });
  } catch (err) {
    console.error("[GET /api/stages]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as { role?: string; id?: string };
    if (user.role !== "MUSICIAN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: MUSICIAN or ADMIN role required" }, { status: 403 });
    }
    const musician = await prisma.musician.findUnique({ where: { userId: user.id } });
    if (!musician) return NextResponse.json({ error: "Musician profile not found" }, { status: 404 });
    const body = await request.json();
    const { name, description, latitude, longitude, altitude, radius, isPublic } = body;
    if (!name || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: "name, latitude, longitude required" }, { status: 400 });
    }
    const stage = await prisma.stage.create({
      data: {
        musicianId: musician.id, name,
        description: description ?? null,
        latitude: Number(latitude), longitude: Number(longitude),
        altitude: altitude ? Number(altitude) : 0,
        radius: radius ? Number(radius) : 50,
        isPublic: isPublic !== false,
      },
    });

    // Create territory for the stage
    await prisma.territory.create({
      data: {
        stageId: stage.id,
        name: stage.name,
        latitude: stage.latitude,
        longitude: stage.longitude,
        influenceJson: "{}",
      },
    });

    return NextResponse.json({ data: stage }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/stages]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
