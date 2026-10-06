import type { ImageLoaderProps } from 'next/image';

const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)([^?#]+)(.*)$/;

export function isCloudinaryImage(src: string): boolean {
  return CLOUDINARY_UPLOAD.test(src);
}

/** Let Cloudinary serve a responsive size and negotiate AVIF/WebP with the browser. */
export function cloudinaryImageLoader({ src, width, quality }: ImageLoaderProps): string {
  const match = CLOUDINARY_UPLOAD.exec(src);
  if (!match) return src;
  const [, prefix, path, suffix] = match;
  const segments = path.split('/');
  // The backend already supplies a delivery transformation. Keep its crop mode.
  const current = segments[0].includes(',') ? segments.shift()! : '';
  const crop = current.includes('c_fill') ? 'c_fill,g_face' : 'c_limit';
  const height = crop === 'c_fill,g_face' ? `,h_${width}` : '';
  return `${prefix}f_auto,q_${quality ?? 'auto'},w_${width}${height},${crop}/${segments.join('/')}${suffix}`;
}
