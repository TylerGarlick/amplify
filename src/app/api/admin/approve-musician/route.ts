import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sessionUser = session.user as { role?: string; id?: string };
    if (sessionUser.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    await prisma.user.update({ where: { id: userId }, data: { role: "MUSICIAN" } });
    const musician = await prisma.musician.upsert({
      where: { userId },
      update: { status: "APPROVED" },
      create: { userId, displayName: targetUser.name ?? targetUser.email ?? userId, status: "APPROVED" },
    });
    return NextResponse.json({ data: { musician, role: "MUSICIAN" } });
  } catch (err) {
    console.error("[POST /api/admin/approve-musician]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
