import { NextResponse } from "next/server";
import { getTerritoryInfluence } from "@/lib/tribe/territory-service";

// GET /api/territories/[id]/influence - Get detailed influence breakdown
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const influence = await getTerritoryInfluence(id);

    if (!influence) {
      return NextResponse.json({ error: "Territory not found" }, { status: 404 });
    }

    return NextResponse.json(influence);
  } catch (error) {
    console.error("Error fetching territory influence:", error);
    return NextResponse.json({ error: "Failed to fetch influence" }, { status: 500 });
  }
}