import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTerritoryInfluence } from "@/lib/tribe/territory-service";

// GET /api/territories - List all territories with basic info
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tribeId = searchParams.get("tribeId");

    const territories = await prisma.territory.findMany({
      include: {
        owningTribe: true,
        stage: {
          include: {
            musician: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Filter by tribe if specified
    const filtered = tribeId
      ? territories.filter((t) => t.owningTribeId === tribeId)
      : territories;

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Error fetching territories:", error);
    return NextResponse.json({ error: "Failed to fetch territories" }, { status: 500 });
  }
}

// POST /api/territories - Create territory from stage (when stage is created)
export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { stageId, name, latitude, longitude } = body;

    if (!stageId || !name || latitude == null || longitude == null) {
      return NextResponse.json(
        { error: "Stage ID, name, latitude, and longitude required" },
        { status: 400 }
      );
    }

    // Check if territory already exists for this stage
    const existing = await prisma.territory.findUnique({ where: { stageId } });
    if (existing) {
      return NextResponse.json({ error: "Territory already exists for this stage" }, { status: 400 });
    }

    const territory = await prisma.territory.create({
      data: {
        stageId,
        name,
        latitude,
        longitude,
        influenceJson: "{}",
      },
      include: {
        owningTribe: true,
        stage: {
          include: {
            musician: true,
          },
        },
      },
    });

    return NextResponse.json(territory);
  } catch (error) {
    console.error("Error creating territory:", error);
    return NextResponse.json({ error: "Failed to create territory" }, { status: 500 });
  }
}