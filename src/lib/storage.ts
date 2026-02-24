import fs from "fs/promises";
import path from "path";

const LOCAL_BASE = path.resolve(
  process.env.STORAGE_LOCAL_PATH ?? "./uploads"
);

/**
 * Save a buffer to local filesystem under uploads/.
 * Returns the public-facing URL path.
 *
 * In production, swap this implementation for S3:
 *   Set STORAGE_PROVIDER=s3 and add AWS_* env vars.
 */
export async function saveFile(
  buffer: Buffer,
  subdir: string,
  filename: string
): Promise<string> {
  const dir = path.join(LOCAL_BASE, subdir);
  await fs.mkdir(dir, { recursive: true });
  const dest = path.join(dir, filename);
  await fs.writeFile(dest, buffer);
  return `/uploads/${subdir}/${filename}`;
}

/**
 * Delete a file stored via saveFile().
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  const relativePath = fileUrl.replace(/^\/uploads\//, "");
  const fullPath = path.join(LOCAL_BASE, relativePath);
  await fs.unlink(fullPath).catch(() => {});
}

/**
 * Generate a unique filename preserving the original extension.
 */
export function uniqueFilename(originalName: string): string {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${rand}${ext}`;
}
