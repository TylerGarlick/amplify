/**
 * Server-side music metadata extraction using music-metadata library.
 * Extracts duration, bitrate, sample rate, codec info, and basic tags
 * from audio files stored on the local filesystem.
 */

import * as mm from "music-metadata";
import fs from "fs/promises";
import path from "path";

export interface ExtractedMetadata {
  /** Duration in seconds */
  duration: number | null;
  /** Bitrate in kbps (estimated from file size / duration if not embedded) */
  bitrate: number | null;
  /** Sample rate in Hz */
  sampleRate: number | null;
  /** Number of channels (1 = mono, 2 = stereo) */
  channels: number | null;
  /** Codec name (e.g., "mp3", "flac", "aac") */
  codec: string | null;
  /** Embedded title tag */
  title: string | null;
  /** Embedded artist tag */
  artist: string | null;
  /** Embedded album tag */
  album: string | null;
  /** Embedded year tag */
  year: number | null;
  /** Embedded track number */
  trackNumber: number | null;
  /** Embedded genre tags */
  genre: string[] | null;
}

const LOCAL_BASE = path.resolve(
  process.env.STORAGE_LOCAL_PATH ?? "./uploads"
);

/**
 * Extract metadata from a stored audio file.
 * Works with local filesystem paths under STORAGE_LOCAL_PATH.
 *
 * @param fileUrl  - The public URL path, e.g. "/uploads/music/123456-abc.mp3"
 * @param fileSize - File size in bytes (used for bitrate estimation)
 */
export async function extractMetadata(
  fileUrl: string,
  fileSize: number
): Promise<ExtractedMetadata> {
  const relativePath = fileUrl.replace(/^\/uploads\//, "");
  const fullPath = path.join(LOCAL_BASE, relativePath);

  const defaultResult: ExtractedMetadata = {
    duration: null,
    bitrate: null,
    sampleRate: null,
    channels: null,
    codec: null,
    title: null,
    artist: null,
    album: null,
    year: null,
    trackNumber: null,
    genre: null,
  };

  try {
    const buffer = await fs.readFile(fullPath);
    const metadata = await mm.parseBuffer(buffer, undefined, { duration: true });

    const { format, common } = metadata;

    // Estimate bitrate from file size and duration if not embedded
    let bitrate: number | null = null;
    if (format.bitrate) {
      bitrate = Math.round(format.bitrate / 1000); // convert to kbps
    } else if (format.duration && fileSize > 0) {
      bitrate = Math.round((fileSize * 8) / format.duration / 1000);
    }

    return {
      duration: format.duration ?? null,
      bitrate,
      sampleRate: format.sampleRate ?? null,
      channels: format.numberOfChannels ?? null,
      codec: format.codec ?? null,
      title: common.title ?? null,
      artist: common.artist ?? null,
      album: common.album ?? null,
      year: common.year ?? null,
      trackNumber: common.track.no ?? null,
      genre: common.genre ?? null,
    };
  } catch (err) {
    console.warn(`[extractMetadata] Failed to parse metadata for ${fileUrl}:`, err);
    return defaultResult;
  }
}

/**
 * Given an existing set of form fields and extracted metadata,
 * return a merged "best available" set of track properties.
 */
export function mergeTrackMetadata(
  formFields: {
    title?: string;
    artist?: string;
  },
  extracted: ExtractedMetadata
): {
  title: string;
  artist: string;
  duration: number | null;
  bitrate: number | null;
  sampleRate: number | null;
  channels: number | null;
} {
  return {
    title: formFields.title || extracted.title || "Unknown Track",
    artist: formFields.artist || extracted.artist || "Unknown Artist",
    duration: extracted.duration,
    bitrate: extracted.bitrate,
    sampleRate: extracted.sampleRate,
    channels: extracted.channels,
  };
}
