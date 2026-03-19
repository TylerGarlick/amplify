import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processWatchSession, getUserTribe } from "@/lib/tribe/territory-service";

// POST /api/watch - Record watch time at a location
export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string } | undefined;
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { territoryId, seconds } = body;

    if (!territoryId || !seconds) {
      return NextResponse.json(
        { error: "Territory ID and seconds required" },
        { status: 400 }
      );
    }

    // Check user is in a tribe
    const userTribe = await getUserTribe(user.id);
    if (!userTribe) {
      return NextResponse.json(
        { error: "You must join a tribe to watch and earn influence" },
        { status: 400 }
      );
    }

    const result = await processWatchSession(user.id, territoryId, seconds);

    return NextResponse.json({
      success: true,
      counted: result.counted,
      ownershipChanged: result.ownershipChanged,
      message: result.counted 
        ? "Watch time counted towards tribe influence!" 
        : `Keep watching! ${60 - (seconds % 60)}s more to contribute.`,
    });
  } catch (error) {
    console.error("Error processing watch:", error);
    return NextResponse.json({ error: "Failed to process watch" }, { status: 500 });
  }
}

// GET /api/watch - Get user's watch stats
export async function GET(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string } | undefined;
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const territoryId = searchParams.get("territoryId");

    if (territoryId) {
      // Get watch session for specific territory
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const watch = await prisma.locationWatch.findFirst({
        where: {
          userId: user.id,
          territoryId,
          sessionStart: { gte: today },
        },
      });

      return NextResponse.json({
        watchTimeSeconds: watch?.watchTimeSeconds || 0,
        counted: watch?.counted || false,
        meetsMinimum: (watch?.watchTimeSeconds || 0) >= 60,
      });
    } else {
      // Get all watch sessions for user
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const watches = await prisma.locationWatch.findMany({
        where: {
          userId: user.id,
          sessionStart: { gte: today },
        },
        include: {
          territory: true,
        },
        orderBy: { sessionStart: "desc" },
      });

      return NextResponse.json(watches);
    }
  } catch (error) {
    console.error("Error fetching watch stats:", error);
    return NextResponse.json({ error: "Failed to fetch watch stats" }, { status: 500 });
  }
}