import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const viz = await prisma.visualization.findUnique({ where: { id }, include: { stage: true } });
    if (!viz) return NextResponse.json({ error: "Visualization not found" }, { status: 404 });
    return NextResponse.json({ data: viz });
  } catch (err) {
    console.error("[GET /api/visualizations/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as { role?: string; id?: string };
    const { id } = await params;
    const viz = await prisma.visualization.findUnique({ where: { id }, include: { stage: { include: { musician: true } } } });
    if (!viz) return NextResponse.json({ error: "Visualization not found" }, { status: 404 });
    if (user.role !== "ADMIN" && viz.stage.musician.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await request.json();
    const updated = await prisma.visualization.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.configJson !== undefined && { configJson: typeof body.configJson === "string" ? body.configJson : JSON.stringify(body.configJson) }),
        ...(body.offsetX !== undefined && { offsetX: Number(body.offsetX) }),
        ...(body.offsetY !== undefined && { offsetY: Number(body.offsetY) }),
        ...(body.offsetZ !== undefined && { offsetZ: Number(body.offsetZ) }),
        ...(body.rotationX !== undefined && { rotationX: Number(body.rotationX) }),
        ...(body.rotationY !== undefined && { rotationY: Number(body.rotationY) }),
        ...(body.rotationZ !== undefined && { rotationZ: Number(body.rotationZ) }),
        ...(body.scaleX !== undefined && { scaleX: Number(body.scaleX) }),
        ...(body.scaleY !== undefined && { scaleY: Number(body.scaleY) }),
        ...(body.scaleZ !== undefined && { scaleZ: Number(body.scaleZ) }),
        ...(body.isVisible !== undefined && { isVisible: body.isVisible }),
        ...(body.reactToFrequency !== undefined && { reactToFrequency: body.reactToFrequency }),
        ...(body.reactIntensity !== undefined && { reactIntensity: Number(body.reactIntensity) }),
        ...(body.sortOrder !== undefined && { sortOrder: Number(body.sortOrder) }),
      },
    });
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[PATCH /api/visualizations/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as { role?: string; id?: string };
    const { id } = await params;
    const viz = await prisma.visualization.findUnique({ where: { id }, include: { stage: { include: { musician: true } } } });
    if (!viz) return NextResponse.json({ error: "Visualization not found" }, { status: 404 });
    if (user.role !== "ADMIN" && viz.stage.musician.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await prisma.visualization.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    console.error("[DELETE /api/visualizations/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
