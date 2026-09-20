import crypto from "node:crypto";
import sharp from "sharp";

export interface MagicByteCheckResult {
  valid: boolean;
  detectedMime: string | null;
  error?: string;
}

export function detectImageMagicBytes(buffer: Buffer): MagicByteCheckResult {
  if (buffer.length < 12) {
    return { valid: false, detectedMime: null, error: "File buffer too small for header analysis" };
  }

  // Windows PE Executable (MZ)
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { valid: false, detectedMime: null, error: "Executable binary signatures are rejected" };
  }

  // ELF executable
  if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return { valid: false, detectedMime: null, error: "Executable binary signatures are rejected" };
  }

  // PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { valid: false, detectedMime: null, error: "PDF documents are not allowed as image media" };
  }

  // JPEG (FF D8 FF)
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: "image/jpeg" };
  }

  // PNG (89 50 4E 47 0D 0A 1A 0A)
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedMime: "image/png" };
  }

  // GIF (GIF87a or GIF89a)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return { valid: true, detectedMime: "image/gif" };
  }

  // WebP (RIFF .... WEBP)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, detectedMime: "image/webp" };
  }

  return { valid: false, detectedMime: null, error: "File signature does not match any allowed image format (JPEG, PNG, WebP, GIF)" };
}

export interface ProcessedImageResult {
  buffer: Buffer;
  byteSize: number;
  width: number;
  height: number;
  mimeType: "image/webp";
  sha256Hash: string;
}

export const MAX_PIXEL_DIMENSION = 4096;
export const MAX_DECOMPRESSION_AREA = 50_000_000; // 50 megapixels sanity check

export async function processImageUpload(
  rawBuffer: Buffer,
  allowedMimeTypes?: string[]
): Promise<ProcessedImageResult> {
  // 1. Magic byte validation
  const magicCheck = detectImageMagicBytes(rawBuffer);
  if (!magicCheck.valid || !magicCheck.detectedMime) {
    throw new Error(magicCheck.error || "Invalid file signature: Content magic bytes do not match an allowed image type");
  }

  if (allowedMimeTypes && allowedMimeTypes.length > 0) {
    if (!allowedMimeTypes.includes(magicCheck.detectedMime)) {
      throw new Error(`MIME type '${magicCheck.detectedMime}' is not permitted by upload permit`);
    }
  }

  // 2. Inspect metadata before heavy processing (decompression bomb check)
  const imageInstance = sharp(rawBuffer, { failOn: "error" });
  const metadata = await imageInstance.metadata();

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (width === 0 || height === 0) {
    throw new Error("Invalid image: unable to determine dimensions");
  }

  if (width * height > MAX_DECOMPRESSION_AREA || width > 10000 || height > 10000) {
    throw new Error("Decompression bomb protection: Image dimensions exceed safe processing thresholds");
  }

  // 3. Transformation & Sanitization:
  // - .rotate() auto-orients from EXIF orientation
  // - .resize() bounds to 4096 x 4096
  // - .webp() re-encodes to WebP (stripping all EXIF, GPS, camera metadata)
  const processedBuffer = await sharp(rawBuffer)
    .rotate()
    .resize({
      width: MAX_PIXEL_DIMENSION,
      height: MAX_PIXEL_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toBuffer();

  const finalMetadata = await sharp(processedBuffer).metadata();
  const finalWidth = finalMetadata.width || width;
  const finalHeight = finalMetadata.height || height;
  const byteSize = processedBuffer.length;

  const sha256Hash = crypto.createHash("sha256").update(processedBuffer).digest("hex");

  return {
    buffer: processedBuffer,
    byteSize,
    width: finalWidth,
    height: finalHeight,
    mimeType: "image/webp",
    sha256Hash,
  };
}
