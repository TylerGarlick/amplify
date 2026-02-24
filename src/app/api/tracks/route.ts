import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as { role?: string; id?: string };
    if (user.role === "ADMIN") {
      const tracks = await prisma.track.findMany({
        include: { musician: { select: { displayName: true } } },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ data: tracks });
    }
    const musician = await prisma.musician.findUnique({ where: { userId: user.id } });
    if (!musician) return NextResponse.json({ data: [] });
    const tracks = await prisma.track.findMany({
      where: { musicianId: musician.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: tracks });
  } catch (err) {
    console.error("[GET /api/tracks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as { role?: string; id?: string };
    if (user.role !== "MUSICIAN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const musician = await prisma.musician.findUnique({ where: { userId: user.id } });
    if (!musician) return NextResponse.json({ error: "Musician profile not found" }, { status: 404 });
    const body = await request.json();
    const { title, artist, fileUrl, mimeType, fileSize, duration, bpm, key, energy } = body;
    if (!title || !fileUrl || !mimeType || !fileSize) {
      return NextResponse.json({ error: "title, fileUrl, mimeType, fileSize required" }, { status: 400 });
    }
    const track = await prisma.track.create({
      data: {
        musicianId: musician.id, title, fileUrl, mimeType,
        artist: artist ?? musician.displayName,
        fileSize: Number(fileSize),
        duration: duration ? Number(duration) : null,
        bpm: bpm ? Number(bpm) : null,
        key: key ?? null,
        energy: energy ? Number(energy) : null,
        status: "READY",
      },
    });
    return NextResponse.json({ data: track }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/tracks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
