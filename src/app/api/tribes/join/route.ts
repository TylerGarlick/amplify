import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { joinTribe, getUserTribe } from "@/lib/tribe/territory-service";

// POST /api/tribes/join - Join a tribe
export async function POST(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string } | undefined;
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { tribeId } = body;

    if (!tribeId) {
      return NextResponse.json({ error: "Tribe ID required" }, { status: 400 });
    }

    await joinTribe(user.id, tribeId);
    const tribe = await getUserTribe(user.id);
    
    return NextResponse.json({ 
      message: "Successfully joined tribe",
      tribe 
    });
  } catch (error) {
    console.error("Error joining tribe:", error);
    return NextResponse.json({ error: "Failed to join tribe" }, { status: 500 });
  }
}