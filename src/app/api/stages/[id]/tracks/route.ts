import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

async function getAuthorizedStage(id: string, userId: string | undefined, role: string | undefined) {
  const stage = await prisma.stage.findUnique({
    where: { id },
    include: { musician: true },
  });
  if (!stage) return null;
  if (role !== "ADMIN" && stage.musician.userId !== userId) return null;
  return stage;
}

// GET /api/stages/[id]/tracks - Get stage tracks
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { id } = await params;
    const user = session.user as { role?: string; id?: string };
    const stage = await getAuthorizedStage(id, user.id, user.role);
    
    if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    
    const links = await prisma.stageTrack.findMany({
      where: { stageId: id },
      include: { track: true },
      orderBy: { sortOrder: "asc" },
    });
    
    return NextResponse.json({ data: links });
  } catch (err) {
    console.error("[GET /api/stages/[id]/tracks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/stages/[id]/tracks - Add track to stage
export async function POST(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { id: stageId } = await params;
    const user = session.user as { role?: string; id?: string };
    const stage = await getAuthorizedStage(stageId, user.id, user.role);
    
    if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    
    const body = await request.json();
    const { trackUrl, title, mimeType, fileSize, artist, bpm, key, energy } = body;
    
    if (!trackUrl || !title || !mimeType || !fileSize) {
      return NextResponse.json({ error: "trackUrl, title, mimeType, fileSize required" }, { status: 400 });
    }
    
    // Get or create musician profile
    const musician = await prisma.musician.findUnique({ where: { userId: user.id } });
    if (!musician) return NextResponse.json({ error: "Musician profile not found" }, { status: 404 });
    
    // Create the track
    const track = await prisma.track.create({
      data: {
        musicianId: musician.id,
        title,
        artist: artist ?? musician.displayName,
        fileUrl: trackUrl,
        mimeType,
        fileSize,
        bpm: bpm ? Number(bpm) : null,
        key: key ?? null,
        energy: energy ? Number(energy) : null,
        status: "READY",
      },
    });
    
    // Link to stage
    const existingLinks = await prisma.stageTrack.count({ where: { stageId } });
    const stageTrack = await prisma.stageTrack.create({
      data: {
        stageId,
        trackId: track.id,
        sortOrder: existingLinks,
        loopMode: "single",
      },
    });
    
    return NextResponse.json({ data: { track, stageTrack } }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/stages/[id]/tracks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/stages/[id]/tracks - Remove track from stage
export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { id: stageId } = await params;
    const user = session.user as { role?: string; id?: string };
    const stage = await getAuthorizedStage(stageId, user.id, user.role);
    
    if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    
    const { searchParams } = new URL(request.url);
    const trackId = searchParams.get("trackId");
    
    if (!trackId) return NextResponse.json({ error: "trackId required" }, { status: 400 });
    
    // Remove the link (not the track itself)
    await prisma.stageTrack.deleteMany({
      where: { stageId, trackId },
    });
    
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    console.error("[DELETE /api/stages/[id]/tracks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}