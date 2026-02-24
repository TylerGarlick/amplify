import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session) {
      const publicStages = await prisma.stage.findMany({
        where: { isActive: true, isPublic: true },
        include: { musician: { select: { displayName: true } } },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ data: publicStages });
    }
    const user = session.user as { role?: string; id?: string };
    if (user.role === "ADMIN") {
      const stages = await prisma.stage.findMany({
        include: { musician: { select: { displayName: true } } },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ data: stages });
    }
    const musician = await prisma.musician.findUnique({ where: { userId: user.id } });
    if (!musician) return NextResponse.json({ data: [] });
    const stages = await prisma.stage.findMany({
      where: { musicianId: musician.id },
      include: { visualizations: true, stageTrackLinks: { include: { track: true } } },
      orderBy: { createdAt: "desc" },
    });
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
    return NextResponse.json({ data: stage }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/stages]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
