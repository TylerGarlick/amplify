import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserTribe } from "@/lib/tribe/territory-service";

// GET /api/tribes/mine - Get user's current tribe
export async function GET() {
  try {
    const session = await auth();
    const user = session?.user as { id?: string } | undefined;
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tribe = await getUserTribe(user.id);
    return NextResponse.json(tribe);
  } catch (error) {
    console.error("Error fetching user tribe:", error);
    return NextResponse.json({ error: "Failed to fetch tribe" }, { status: 500 });
  }
}