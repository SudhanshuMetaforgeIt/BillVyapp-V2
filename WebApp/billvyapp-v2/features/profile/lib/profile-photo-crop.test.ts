import { afterEach, describe, expect, it, vi } from 'vitest';
import { cropGeometry, DEFAULT_CROP, drawProfileCrop, exportProfileCrop } from './profile-photo-crop';

describe('Profile photo crop geometry', () => {
  it('centers a square within landscape and portrait images', () => {
    expect(cropGeometry(1200, 800, DEFAULT_CROP)).toMatchObject({ side: 800, centerX: 600, centerY: 400 });
    expect(cropGeometry(800, 1200, DEFAULT_CROP)).toMatchObject({ side: 800, centerX: 400, centerY: 600 });
  });
  it('zooms and positions the crop without exposing empty edges', () => {
    const g = cropGeometry(1200, 800, { ...DEFAULT_CROP, zoom: 2, x: 1, y: -1 });
    expect(g.side).toBe(400);
    expect(g.centerX + g.side / 2).toBe(1200);
    expect(g.centerY - g.side / 2).toBe(0);
  });
  it.each([90, 270])('swaps bounds for %s degree rotation', (rotation) => {
    expect(cropGeometry(1200, 800, { ...DEFAULT_CROP, rotation })).toMatchObject({ width: 800, height: 1200, side: 800, centerX: 400, centerY: 600 });
  });
  it('retains bounds for half turns and clamps adjustments', () => {
    expect(cropGeometry(1200, 800, { zoom: 0, x: 5, y: -5, rotation: 180 })).toMatchObject({ width: 1200, height: 800, side: 800, centerX: 800, centerY: 400 });
    expect(cropGeometry(900, 900, { ...DEFAULT_CROP, zoom: 10 }).side).toBe(300);
  });
});

describe('Profile crop rendering and export', () => {
  afterEach(() => vi.unstubAllGlobals());

  function canvasDouble(blob: Blob | null = new Blob(['image'], { type: 'image/png' })) {
    const context = { clearRect: vi.fn(), save: vi.fn(), restore: vi.fn(), translate: vi.fn(), scale: vi.fn(), rotate: vi.fn(), drawImage: vi.fn(), imageSmoothingEnabled: false, imageSmoothingQuality: 'low' };
    const canvas = { width: 512, height: 512, getContext: vi.fn(() => context), toBlob: vi.fn((callback: BlobCallback) => callback(blob)) };
    return { context, canvas };
  }
  const image = { width: 1200, height: 800 } as ImageBitmap;

  it('renders rotation and zoom using the bounded preview transform', () => {
    const { context, canvas } = canvasDouble();
    drawProfileCrop(canvas as unknown as HTMLCanvasElement, image, { ...DEFAULT_CROP, rotation: 90, zoom: 2 });
    expect(context.scale).toHaveBeenCalledWith(512 / 400, 512 / 400);
    expect(context.rotate).toHaveBeenCalledWith(Math.PI / 2);
    expect(context.drawImage).toHaveBeenCalledWith(image, -600, -400);
    expect(context.restore).toHaveBeenCalledOnce();
  });
  it('exports a 512px PNG with metadata accepted by the existing upload flow', async () => {
    const { canvas } = canvasDouble();
    vi.stubGlobal('document', { createElement: vi.fn(() => canvas) });
    const result = await exportProfileCrop(image, DEFAULT_CROP, 'holiday.jpeg');
    expect(result.name).toBe('holiday-profile.png');
    expect(result.type).toBe('image/png');
    expect(result.size).toBeGreaterThan(0);
    expect(canvas.width).toBe(512);
    expect(canvas.height).toBe(512);
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
  });
  it('rejects a failed encoding instead of uploading empty bytes', async () => {
    const { canvas } = canvasDouble(null);
    vi.stubGlobal('document', { createElement: vi.fn(() => canvas) });
    await expect(exportProfileCrop(image, DEFAULT_CROP, 'photo.png')).rejects.toThrow('Unable to prepare');
  });
});
