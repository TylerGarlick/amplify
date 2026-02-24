import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const visualizations = await prisma.visualization.findMany({
      where: { stageId: id },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json({ data: visualizations });
  } catch (err) {
    console.error("[GET /api/stages/[id]/visualizations]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as { role?: string; id?: string };
    if (user.role !== "MUSICIAN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id } = await params;
    const stage = await prisma.stage.findUnique({ where: { id } });
    if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    if (user.role !== "ADMIN") {
      const musician = await prisma.musician.findUnique({ where: { userId: user.id } });
      if (!musician || stage.musicianId !== musician.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    const body = await request.json();
    const { name, type, configJson, offsetX, offsetY, offsetZ, rotationX, rotationY, rotationZ, scaleX, scaleY, scaleZ, assetUrl, reactToFrequency, reactIntensity, aiPrompt, sortOrder } = body;
    if (!name || !type || !configJson) {
      return NextResponse.json({ error: "name, type, configJson required" }, { status: 400 });
    }
    const viz = await prisma.visualization.create({
      data: {
        stageId: id, name, type,
        configJson: typeof configJson === "string" ? configJson : JSON.stringify(configJson),
        offsetX: offsetX ?? 0, offsetY: offsetY ?? 0, offsetZ: offsetZ ?? 0,
        rotationX: rotationX ?? 0, rotationY: rotationY ?? 0, rotationZ: rotationZ ?? 0,
        scaleX: scaleX ?? 1, scaleY: scaleY ?? 1, scaleZ: scaleZ ?? 1,
        assetUrl: assetUrl ?? null,
        reactToFrequency: reactToFrequency ?? "bass",
        reactIntensity: reactIntensity ?? 1.0,
        aiPrompt: aiPrompt ?? null,
        sortOrder: sortOrder ?? 0,
      },
    });
    return NextResponse.json({ data: viz }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/stages/[id]/visualizations]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
