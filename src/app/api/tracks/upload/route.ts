import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { saveFile, uniqueFilename } from "@/lib/storage";

const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
  "audio/m4a",
  "audio/mp4",
];
const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

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

    const mimeType = file.type;
    if (!ALLOWED_AUDIO_TYPES.includes(mimeType)) {
      return NextResponse.json({ error: "Invalid audio file type. Use MP3, WAV, FLAC, OGG, or AAC." }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File exceeds 100MB limit" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = uniqueFilename(file.name);
    const fileUrl = await saveFile(buffer, "music", filename);

    return NextResponse.json({
      data: {
        fileUrl,
        mimeType,
        fileSize: file.size,
        originalName: file.name,
      },
    }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/tracks/upload]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
