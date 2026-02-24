import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };
const VALID_ROLES = ["USER", "MUSICIAN", "ADMIN"];

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sessionUser = session.user as { role?: string; id?: string };
    if (sessionUser.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    const { role } = await request.json();
    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Valid role required: USER, MUSICIAN, or ADMIN" }, { status: 400 });
    }
    const updated = await prisma.user.update({ where: { id }, data: { role }, select: { id: true, email: true, name: true, role: true } });
    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error("[PATCH /api/admin/users/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
