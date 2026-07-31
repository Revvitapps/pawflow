import "server-only";

/**
 * Image-upload validation for pet photos and brand/logo intake.
 *
 * Defense in depth: we never trust the client-supplied Content-Type. Every upload
 * must (1) be under the size cap, (2) carry an allow-listed MIME type, AND (3)
 * have magic bytes that actually match a raster image. SVG and HTML are rejected
 * outright because they can carry script (stored XSS) — an <svg onload> or an
 * HTML file served from our origin would execute in the victim's session.
 */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

// Only raster formats. Deliberately excludes image/svg+xml.
export const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export interface UploadValidationResult {
  ok: boolean;
  error?: string;
  mime?: string;
}

/** Sniff the real format from the leading bytes. Returns null if unrecognized. */
function sniffImageMime(bytes: Uint8Array): string | null {
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  // GIF: "GIF87a" / "GIF89a"
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61
  ) {
    return "image/gif";
  }
  // WEBP: "RIFF"...."WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

/** Detect markup that must never be accepted as an image (SVG/HTML/XML). */
function looksLikeMarkup(bytes: Uint8Array): boolean {
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.slice(0, 256))
    .trim()
    .toLowerCase();
  return (
    head.startsWith("<?xml") ||
    head.startsWith("<svg") ||
    head.startsWith("<!doctype") ||
    head.startsWith("<html") ||
    head.includes("<script")
  );
}

/**
 * Validate raw upload bytes. `declaredMime` is the client-claimed type (checked
 * against the allowlist) but the magic-byte sniff is authoritative.
 */
export function validateImageUpload(
  bytes: Uint8Array,
  declaredMime?: string,
): UploadValidationResult {
  if (bytes.length === 0) return { ok: false, error: "Empty file." };
  if (bytes.length > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `File exceeds ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB limit.` };
  }
  if (declaredMime && !ALLOWED_IMAGE_MIME.has(declaredMime.toLowerCase())) {
    return { ok: false, error: "Unsupported file type. Upload a JPEG, PNG, WebP, or GIF image." };
  }
  if (looksLikeMarkup(bytes)) {
    return { ok: false, error: "SVG/HTML uploads are not allowed." };
  }
  const sniffed = sniffImageMime(bytes);
  if (!sniffed || !ALLOWED_IMAGE_MIME.has(sniffed)) {
    return { ok: false, error: "File content is not a valid image." };
  }
  return { ok: true, mime: sniffed };
}

/** Convenience wrapper for a Web File/Blob (e.g. from FormData). */
export async function validateImageFile(file: Blob): Promise<UploadValidationResult> {
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `File exceeds ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB limit.` };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  return validateImageUpload(bytes, file.type || undefined);
}
