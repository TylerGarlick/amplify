import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const stage = await prisma.stage.findUnique({
      where: { id, isActive: true, isPublic: true },
      include: {
        musician: { select: { displayName: true, avatarUrl: true } },
        visualizations: { orderBy: { sortOrder: "asc" } },
        stageTrackLinks: { orderBy: { sortOrder: "asc" }, include: { track: true } },
      },
    });
    if (!stage) return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    const stageWithParsed = {
      ...stage,
      visualizations: stage.visualizations.map((v) => ({ ...v, config: JSON.parse(v.configJson) })),
      activeTrack: stage.stageTrackLinks[0]?.track ?? null,
    };
    return NextResponse.json({ data: stageWithParsed });
  } catch (err) {
    console.error("[GET /api/ar/stage/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
