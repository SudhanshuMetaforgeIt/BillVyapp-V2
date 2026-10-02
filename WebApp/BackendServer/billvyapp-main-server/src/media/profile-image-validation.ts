import { BadRequestException } from '@nestjs/common';
import {
  PROFILE_IMAGE_MAX_BYTES,
  PROFILE_IMAGE_MIME_TYPES,
} from './profile-photo.dto';

/** Inspect actual bytes, not just a caller-supplied Content-Type or extension. */
export function validateProfileImage(bytes: Buffer, mimeType: string): void {
  const png = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP';
  const avif =
    bytes.toString('ascii', 4, 8) === 'ftyp' &&
    (bytes.toString('ascii', 8, 12) === 'avif' ||
      bytes.toString('ascii', 8, 12) === 'avis');
  const valid = {
    'image/png': png,
    'image/jpeg': jpeg,
    'image/webp': webp,
    'image/avif': avif,
  }[mimeType];
  if (
    !PROFILE_IMAGE_MIME_TYPES.includes(
      mimeType as (typeof PROFILE_IMAGE_MIME_TYPES)[number],
    ) ||
    bytes.length < 12 ||
    bytes.length > PROFILE_IMAGE_MAX_BYTES ||
    !valid
  ) {
    throw new BadRequestException(
      'Select a JPEG, PNG, WebP or AVIF image no larger than 5 MB',
    );
  }
}
