import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// GET /api/stages/[id]/elements - Get stage elements
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { id } = await params;
    const user = session.user as { role?: string; id?: string };
    
    const stage = await prisma.stage.findUnique({
      where: { id },
      include: { 
        musician: true,
        stageElements: { orderBy: { sortOrder: "asc" } }
      },
    });
    
    if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    
    // Check authorization
    if (user.role !== "ADMIN" && stage.musician.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    return NextResponse.json({ data: stage.stageElements });
  } catch (err) {
    console.error("[GET /api/stages/[id]/elements]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/stages/[id]/elements - Create or update stage elements
export async function POST(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { id: stageId } = await params;
    const user = session.user as { role?: string; id?: string };
    
    const stage = await prisma.stage.findUnique({
      where: { id: stageId },
      include: { musician: true },
    });
    
    if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    
    // Check authorization
    if (user.role !== "ADMIN" && stage.musician.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    const body = await request.json();
    const { elements } = body;
    
    if (!elements || !Array.isArray(elements)) {
      return NextResponse.json({ error: "elements array required" }, { status: 400 });
    }
    
    // Delete existing elements and create new ones
    await prisma.stageElement.deleteMany({ where: { stageId } });
    
    const createdElements = await Promise.all(
      elements.map((el: any, index: number) =>
        prisma.stageElement.create({
          data: {
            stageId,
            type: el.type,
            name: el.name,
            positionX: el.position?.[0] ?? 0,
            positionY: el.position?.[1] ?? 0,
            positionZ: el.position?.[2] ?? 0,
            rotationX: el.rotation?.[0] ?? 0,
            rotationY: el.rotation?.[1] ?? 0,
            rotationZ: el.rotation?.[2] ?? 0,
            scaleX: el.scale?.[0] ?? 1,
            scaleY: el.scale?.[1] ?? 1,
            scaleZ: el.scale?.[2] ?? 1,
            color: el.color ?? "#6b7280",
            configJson: JSON.stringify(el.config ?? {}),
            isVisible: el.isVisible ?? true,
            reactToFrequency: el.reactToFrequency ?? "bass",
            reactIntensity: el.reactIntensity ?? 1,
            sortOrder: el.sortOrder ?? index,
          },
        })
      )
    );
    
    return NextResponse.json({ data: createdElements }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/stages/[id]/elements]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/stages/[id]/elements - Clear all elements
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const { id: stageId } = await params;
    const user = session.user as { role?: string; id?: string };
    
    const stage = await prisma.stage.findUnique({
      where: { id: stageId },
      include: { musician: true },
    });
    
    if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    
    if (user.role !== "ADMIN" && stage.musician.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    
    await prisma.stageElement.deleteMany({ where: { stageId } });
    
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    console.error("[DELETE /api/stages/[id]/elements]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}