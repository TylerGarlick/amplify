import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

async function getAuthorizedTrack(id: string, userId: string | undefined, role: string | undefined) {
  const track = await prisma.track.findUnique({ where: { id }, include: { musician: true } });
  if (!track) return null;
  if (role !== "ADMIN" && track.musician.userId !== userId) return null;
  return track;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const user = session.user as { role?: string; id?: string };
    const track = await getAuthorizedTrack(id, user.id, user.role);
    if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });
    return NextResponse.json({ data: track });
  } catch (err) {
    console.error("[GET /api/tracks/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const user = session.user as { role?: string; id?: string };
    const track = await getAuthorizedTrack(id, user.id, user.role);
    if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });
    const body = await request.json();
    const { title, artist, duration, bpm, key, energy, status } = body;
    const updated = await prisma.track.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(artist !== undefined && { artist }),
        ...(duration !== undefined && { duration: Number(duration) }),
        ...(bpm !== undefined && { bpm: Number(bpm) }),
        ...(key !== undefined && { key }),
        ...(energy !== undefined && { energy: Number(energy) }),
        ...(status !== undefined && { status }),
      },
    });
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[PATCH /api/tracks/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!(await auth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const user = (await auth())?.user as { role?: string; id?: string } | undefined;
    const track = await getAuthorizedTrack(id, user?.id, user?.role);
    if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 });
    await prisma.track.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    console.error("[DELETE /api/tracks/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
