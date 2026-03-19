import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAllTribes, createTribe, seedDefaultTribes } from "@/lib/tribe/territory-service";

// GET /api/tribes - List all tribes
export async function GET() {
  try {
    // Seed default tribes if none exist
    const count = await prisma.tribe.count();
    if (count === 0) {
      await seedDefaultTribes();
    }

    const tribes = await getAllTribes();
    return NextResponse.json(tribes);
  } catch (error) {
    console.error("Error fetching tribes:", error);
    return NextResponse.json({ error: "Failed to fetch tribes" }, { status: 500 });
  }
}

// POST /api/tribes - Create a new fan tribe
export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string } | undefined;
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, genre, color, description } = body;

    if (!name || !genre || !color) {
      return NextResponse.json(
        { error: "Name, genre, and color are required" },
        { status: 400 }
      );
    }

    // Check if tribe name already exists
    const existing = await prisma.tribe.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: "Tribe name already taken" }, { status: 400 });
    }

    const tribe = await createTribe(name, genre, color, description, user.id);
    return NextResponse.json(tribe);
  } catch (error) {
    console.error("Error creating tribe:", error);
    return NextResponse.json({ error: "Failed to create tribe" }, { status: 500 });
  }
}