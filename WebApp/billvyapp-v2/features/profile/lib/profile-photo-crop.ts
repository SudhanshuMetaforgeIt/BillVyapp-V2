export type CropAdjustment = { zoom: number; x: number; y: number; rotation: number };
export const DEFAULT_CROP: CropAdjustment = { zoom: 1, x: 0, y: 0, rotation: 0 };

export function cropGeometry(width: number, height: number, crop: CropAdjustment) {
  const rotated = Math.abs(crop.rotation % 180) === 90;
  const w = rotated ? height : width;
  const h = rotated ? width : height;
  const side = Math.min(w, h) / Math.max(1, Math.min(3, crop.zoom));
  const clamp = (value: number) => Math.max(-1, Math.min(1, value));
  return {
    width: w,
    height: h,
    side,
    centerX: w / 2 + clamp(crop.x) * (w - side) / 2,
    centerY: h / 2 + clamp(crop.y) * (h - side) / 2,
  };
}

/** Preview and uploaded pixels use the same transform, independent of storage. */
export function drawProfileCrop(canvas: HTMLCanvasElement, image: ImageBitmap, crop: CropAdjustment) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image editing is unavailable in this browser.');
  const geometry = cropGeometry(image.width, image.height, crop);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(canvas.width / geometry.side, canvas.height / geometry.side);
  ctx.translate(geometry.width / 2 - geometry.centerX, geometry.height / 2 - geometry.centerY);
  ctx.rotate(crop.rotation * Math.PI / 180);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);
  ctx.restore();
}

export async function exportProfileCrop(image: ImageBitmap, crop: CropAdjustment, originalName: string): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  drawProfileCrop(canvas, image, crop);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Unable to prepare this image.')), 'image/png');
  });
  return new File([blob], `${originalName.replace(/\.[^.]+$/, '')}-profile.png`, { type: 'image/png' });
}
