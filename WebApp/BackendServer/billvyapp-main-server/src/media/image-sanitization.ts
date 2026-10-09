import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

export const IMAGE_MAX_PIXELS = 20_000_000;
export const IMAGE_MAX_DIMENSION = 8192;
const formats: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/webp': 'webp',
  'image/avif': 'heif',
};

/** Decode all pixel data and re-encode without EXIF, scripts, trailing payloads or animation. */
export async function sanitizeImage(
  bytes: Buffer,
  mimeType: string,
  maxBytes: number,
): Promise<Buffer> {
  if (!formats[mimeType] || bytes.length < 12 || bytes.length > maxBytes)
    throw new BadRequestException('Invalid image type or size');
  try {
    const image = sharp(bytes, {
      limitInputPixels: IMAGE_MAX_PIXELS,
      failOn: 'warning',
      animated: false,
    });
    const info = await image.metadata();
    if (
      info.format !== formats[mimeType] ||
      !info.width ||
      !info.height ||
      info.width > IMAGE_MAX_DIMENSION ||
      info.height > IMAGE_MAX_DIMENSION ||
      info.width * info.height > IMAGE_MAX_PIXELS ||
      (info.pages ?? 1) > 1 ||
      (mimeType === 'image/avif' && info.compression !== 'av1')
    )
      throw new Error('Invalid image');
    const result = await image
      .rotate()
      .toFormat(mimeType === 'image/avif' ? 'avif' : formats[mimeType])
      .toBuffer();
    if (result.length > maxBytes) throw new Error('Encoded image too large');
    return result;
  } catch {
    throw new BadRequestException(
      'Image must be a valid, single-frame JPEG, PNG, WebP or AVIF within 8192 pixels per side and 20 megapixels',
    );
  }
}
