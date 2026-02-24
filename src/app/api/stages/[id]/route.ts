import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

async function getAuthorizedStage(id: string, userId: string | undefined, role: string | undefined) {
  const stage = await prisma.stage.findUnique({
    where: { id },
    include: { musician: true, visualizations: { orderBy: { sortOrder: "asc" } }, stageTrackLinks: { include: { track: true } } },
  });
  if (!stage) return null;
  if (role !== "ADMIN" && stage.musician.userId !== userId) return null;
  return stage;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const user = session.user as { role?: string; id?: string };
    const stage = await getAuthorizedStage(id, user.id, user.role);
    if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    return NextResponse.json({ data: stage });
  } catch (err) {
    console.error("[GET /api/stages/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const user = session.user as { role?: string; id?: string };
    const stage = await getAuthorizedStage(id, user.id, user.role);
    if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    const body = await request.json();
    const { name, description, latitude, longitude, altitude, radius, isActive, isPublic } = body;
    const updated = await prisma.stage.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(latitude !== undefined && { latitude: Number(latitude) }),
        ...(longitude !== undefined && { longitude: Number(longitude) }),
        ...(altitude !== undefined && { altitude: Number(altitude) }),
        ...(radius !== undefined && { radius: Number(radius) }),
        ...(isActive !== undefined && { isActive }),
        ...(isPublic !== undefined && { isPublic }),
      },
    });
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[PATCH /api/stages/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const user = session.user as { role?: string; id?: string };
    const stage = await getAuthorizedStage(id, user.id, user.role);
    if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    await prisma.stage.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    console.error("[DELETE /api/stages/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
