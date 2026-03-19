import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const sessionUser = session.user as { role?: string; id?: string };
    if (sessionUser.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    
    const { userId, action } = await request.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isSuspend = action === "suspend";
    
    // Update user role
    await prisma.user.update({
      where: { id: userId },
      data: { role: isSuspend ? "USER" : "MUSICIAN" },
    });

    // Update or create musician record
    const musician = await prisma.musician.upsert({
      where: { userId },
      update: { status: isSuspend ? "SUSPENDED" : "APPROVED" },
      create: {
        userId,
        displayName: targetUser.name ?? targetUser.email ?? userId,
        status: isSuspend ? "SUSPENDED" : "APPROVED"
      },
    });

    return NextResponse.json({
      data: {
        musician,
        role: isSuspend ? "USER" : "MUSICIAN",
      },
    });
  } catch (err) {
    console.error("[POST /api/admin/approve-musician]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}