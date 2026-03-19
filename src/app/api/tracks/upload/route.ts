/**
 * Track Storage Pipeline — POST /api/tracks/upload
 *
 * Unified pipeline that:
 *  1. Receives & validates an uploaded audio file
 *  2. Persists the file to local storage (STORAGE_LOCAL_PATH)
 *  3. Extracts embedded metadata (duration, BPM hint, tags)
 *  4. Creates a Track record in the database with status PROCESSING
 *  5. Kicks off AI analysis in the background (updates to READY on completion)
 *
 * This endpoint is called by the TrackUpload component after file upload.
 * It replaces the need to call /api/upload/audio + /api/tracks separately.
 *
 * Request:  multipart/form-data with fields:
 *   - file:       Audio file (required)
 *   - title:      Track title (optional, falls back to embedded tag or filename)
 *   - artist:     Artist name  (optional, falls back to embedded tag or musician display name)
 *   - autoAnalyze: Whether to run AI analysis after upload (default: true)
 *
 * Response: { data: { track, fileUrl, metadata, aiAnalysisQueued } }
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveFile, uniqueFilename } from "@/lib/storage";
import { extractMetadata, mergeTrackMetadata } from "@/lib/metadata/musicMetadata";

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

const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // ── 1. Auth ────────────────────────────────────────────────────────────
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { role?: string; id?: string };
    if (user.role !== "MUSICIAN" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: MUSICIAN or ADMIN role required" },
        { status: 403 }
      );
    }

    const musician = await prisma.musician.findUnique({
      where: { userId: user.id },
    });
    if (!musician) {
      return NextResponse.json(
        { error: "Musician profile not found. Please complete your musician registration." },
        { status: 404 }
      );
    }

    // ── 2. Parse multipart form data ───────────────────────────────────────
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Invalid form data" },
        { status: 400 }
      );
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    const titleFromForm = (formData.get("title") as string | null)?.trim();
    const artistFromForm = (formData.get("artist") as string | null)?.trim();
    const autoAnalyze = formData.get("autoAnalyze") !== "false";

    // ── 3. Validate file ──────────────────────────────────────────────────
    const mimeType = file.type;
    if (!ALLOWED_AUDIO_TYPES.includes(mimeType)) {
      return NextResponse.json(
        {
          error: `Invalid audio type "${mimeType}". Supported: MP3, WAV, FLAC, OGG, AAC, M4A.`,
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File exceeds ${MAX_SIZE_BYTES / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    // ── 4. Store file ──────────────────────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = uniqueFilename(file.name);
    const fileUrl = await saveFile(buffer, "music", filename);

    // ── 5. Extract metadata ────────────────────────────────────────────────
    let metadata: {
      title: string;
      artist: string;
      duration: number | null;
      bitrate: number | null;
      sampleRate: number | null;
      channels: number | null;
    };

    try {
      const extracted = await extractMetadata(fileUrl, file.size);
      metadata = mergeTrackMetadata(
        { title: titleFromForm, artist: artistFromForm },
        extracted
      );
    } catch (err) {
      console.warn("[POST /api/tracks/upload] Metadata extraction failed, using form fields:", err);
      // Fall back to form fields or sensible defaults
      metadata = {
        title: titleFromForm || file.name.replace(/\.[^/.]+$/, ""),
        artist: artistFromForm || musician.displayName,
        duration: null,
        bitrate: null,
        sampleRate: null,
        channels: null,
      };
    }

    // ── 6. Persist track record ────────────────────────────────────────────
    const track = await prisma.track.create({
      data: {
        musicianId: musician.id,
        title: metadata.title,
        artist: metadata.artist,
        fileUrl,
        mimeType,
        fileSize: file.size,
        duration: metadata.duration,
        status: "PROCESSING",
      },
    });

    // ── 7. Trigger AI analysis (non-blocking) ─────────────────────────────
    let aiAnalysisResult: { queued: boolean; analysisId?: string } = { queued: false };

    if (autoAnalyze) {
      // Fire-and-forget: kick off AI analysis without blocking the response
      void analyzeInBackground(track.id, metadata.title, metadata.artist, musician.id).then(
        (analysisId) => {
          aiAnalysisResult = { queued: true, analysisId };
        }
      ).catch((err) => {
        console.error("[POST /api/tracks/upload] Background AI analysis failed:", err);
      });
    }

    const elapsedMs = Date.now() - startTime;
    console.log(
      `[POST /api/tracks/upload] Track ${track.id} saved in ${elapsedMs}ms — title="${metadata.title}", ` +
      `artist="${metadata.artist}", duration=${metadata.duration ?? "unknown"}s, ai=${aiAnalysisResult.queued}`
    );

    return NextResponse.json(
      {
        data: {
          track: {
            id: track.id,
            title: track.title,
            artist: track.artist,
            fileUrl: track.fileUrl,
            mimeType: track.mimeType,
            fileSize: track.fileSize,
            duration: track.duration,
            status: track.status,
            createdAt: track.createdAt,
          },
          fileUrl,
          metadata: {
            duration: metadata.duration,
            bitrate: metadata.bitrate,
            sampleRate: metadata.sampleRate,
            channels: metadata.channels,
          },
          aiAnalysisQueued: aiAnalysisResult.queued,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/tracks/upload]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Background AI analysis job.
 * Updates track status to READY on success, ERROR on failure.
 */
async function analyzeInBackground(
  trackId: string,
  title: string,
  artist: string,
  musicianId: string
): Promise<string | undefined> {
  try {
    // Import dynamically to avoid top-level imports of heavy modules
    const { analyzeTrack } = await import("@/lib/analysis/trackAnalyzer");

    const analysis = await analyzeTrack({
      trackId,
      title,
      artist,
    });

    await prisma.track.update({
      where: { id: trackId },
      data: {
        bpm: analysis.tempo,
        key: analysis.key,
        energy: analysis.energy,
        aiDescription: analysis.aiDescription,
        aiMoodTags: JSON.stringify([analysis.emotion, ...analysis.genreTags]),
        analysisJson: JSON.stringify({
          tempo: analysis.tempo,
          key: analysis.key,
          energy: analysis.energy,
          emotion: analysis.emotion,
          genreTags: analysis.genreTags,
          analyzedAt: new Date().toISOString(),
        }),
        status: "READY",
      },
    });

    console.log(`[POST /api/tracks/upload] AI analysis complete for track ${trackId}`);
    return trackId;
  } catch (err) {
    console.error(`[POST /api/tracks/upload] AI analysis failed for track ${trackId}:`, err);

    // Mark track as ERROR so it can be retried
    await prisma.track.update({
      where: { id: trackId },
      data: { status: "ERROR" },
    }).catch(() => {}); // ignore secondary errors

    return undefined;
  }
}
