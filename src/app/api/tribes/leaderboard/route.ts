import { NextResponse } from "next/server";
import { getTribeLeaderboard } from "@/lib/tribe/territory-service";

// GET /api/tribes/leaderboard - Get tribe leaderboard
export async function GET() {
  try {
    const leaderboard = await getTribeLeaderboard();
    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}