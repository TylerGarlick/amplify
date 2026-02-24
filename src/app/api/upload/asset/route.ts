import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveFile, uniqueFilename } from "@/lib/storage";

const ALLOWED_ASSET_TYPES = ["model/gltf-binary", "model/gltf+json", "application/octet-stream"];
const ALLOWED_EXTENSIONS = [".glb", ".gltf"];
const MAX_SIZE_BYTES = 100 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as { role?: string; id?: string };
    if (user.role !== "MUSICIAN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: MUSICIAN or ADMIN role required" }, { status: 403 });
    }
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!ALLOWED_ASSET_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: "Only .glb and .gltf files are allowed" }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File exceeds 100MB limit" }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = uniqueFilename(file.name);
    const fileUrl = await saveFile(buffer, "assets", filename);
    return NextResponse.json({ data: { fileUrl } }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/upload/asset]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
