import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyForEnhancement, approveEnhancement, getUserTribe } from "@/lib/tribe/territory-service";

// GET /api/enhancements - List enhancement applications
export async function GET(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string } | undefined;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    if (user.role === "ADMIN") {
      // Admins see all
      const where = status ? { status } : {};
      const enhancements = await prisma.locationEnhancement.findMany({
        where,
        include: {
          tribe: true,
          stage: {
            include: {
              musician: true,
            },
          },
        },
        orderBy: { appliedAt: "desc" },
      });
      return NextResponse.json(enhancements);
    }

    // Regular users can only see their own applications
    const enhancements = await prisma.locationEnhancement.findMany({
      where: {
        tribe: {
          members: {
            some: { userId: user.id },
          },
        },
      },
      include: {
        tribe: true,
        stage: {
          include: {
            musician: true,
          },
        },
      },
    });
    return NextResponse.json(enhancements);
  } catch (error) {
    console.error("Error fetching enhancements:", error);
    return NextResponse.json({ error: "Failed to fetch enhancements" }, { status: 500 });
  }
}

// POST /api/enhancements - Apply for enhancement
export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string } | undefined;
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { stageId } = body;

    if (!stageId) {
      return NextResponse.json({ error: "Stage ID required" }, { status: 400 });
    }

    // Verify user is a musician who owns this stage
    const musician = await prisma.musician.findFirst({
      where: { userId: user.id, status: "APPROVED" },
    });

    if (!musician) {
      return NextResponse.json(
        { error: "Only approved musicians can apply for enhancement" },
        { status: 403 }
      );
    }

    // Check stage belongs to this musician
    const stage = await prisma.stage.findFirst({
      where: { id: stageId, musicianId: musician.id },
    });

    if (!stage) {
      return NextResponse.json(
        { error: "You don't own this stage" },
        { status: 403 }
      );
    }

    // Check user is in a tribe
    const userTribe = await getUserTribe(user.id);
    if (!userTribe) {
      return NextResponse.json(
        { error: "You must join a tribe to apply for enhancement" },
        { status: 400 }
      );
    }

    const enhancement = await applyForEnhancement(stageId, userTribe.id);
    return NextResponse.json(enhancement);
  } catch (error: any) {
    console.error("Error applying for enhancement:", error);
    return NextResponse.json({ error: error.message || "Failed to apply" }, { status: 500 });
  }
}

// PATCH /api/enhancements - Approve/reject enhancement (admin only)
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string; role?: string } | undefined;
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const body = await req.json();
    const { enhancementId, action } = body;

    if (!enhancementId || !action) {
      return NextResponse.json({ error: "Enhancement ID and action required" }, { status: 400 });
    }

    if (action === "approve") {
      await approveEnhancement(enhancementId);
      return NextResponse.json({ message: "Enhancement approved" });
    } else if (action === "reject") {
      await prisma.locationEnhancement.update({
        where: { id: enhancementId },
        data: {
          status: "REJECTED",
          reviewedAt: new Date(),
        },
      });
      return NextResponse.json({ message: "Enhancement rejected" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating enhancement:", error);
    return NextResponse.json({ error: "Failed to update enhancement" }, { status: 500 });
  }
}