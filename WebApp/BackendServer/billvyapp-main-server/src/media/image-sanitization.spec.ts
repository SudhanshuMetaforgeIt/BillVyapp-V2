import sharp from 'sharp';
import { sanitizeImage } from './image-sanitization';
describe('Decoded upload validation', () => {
  it('strips metadata and trailing payloads from valid image pixels', async () => {
    const image = await sharp({
      create: { width: 10, height: 10, channels: 3, background: 'red' },
    })
      .jpeg()
      .withMetadata()
      .toBuffer();
    const result = await sanitizeImage(
      Buffer.concat([image, Buffer.from('<script>secret payload</script>')]),
      'image/jpeg',
      5 * 1024 * 1024,
    );
    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(10);
    expect(metadata.exif).toBeUndefined();
    expect(result.toString()).not.toContain('secret payload');
  });
  it.each(['png', 'jpeg', 'webp', 'avif'] as const)(
    'decodes and re-encodes %s',
    async (format) => {
      const image = await sharp({
        create: { width: 2, height: 2, channels: 3, background: 'white' },
      })
        .toFormat(format)
        .toBuffer();
      await expect(
        sanitizeImage(image, `image/${format}`, 5 * 1024 * 1024),
      ).resolves.toBeInstanceOf(Buffer);
    },
  );
  it('rejects an image dimension bomb', async () => {
    const image = await sharp({
      create: { width: 8193, height: 1, channels: 3, background: 'white' },
    })
      .png()
      .toBuffer();
    await expect(
      sanitizeImage(image, 'image/png', 5 * 1024 * 1024),
    ).rejects.toThrow('8192');
  });
  it('rejects MIME spoofing, truncated pixel data, SVG and oversized bytes', async () => {
    const image = await sharp({
      create: { width: 10, height: 10, channels: 3, background: 'white' },
    })
      .png()
      .toBuffer();
    for (const [bytes, mime] of [
      [image, 'image/jpeg'],
      [image.subarray(0, 30), 'image/png'],
      [Buffer.from('<svg onload="alert(1)"></svg>'), 'image/svg+xml'],
      [image, 'image/png'],
    ] as const)
      await expect(
        sanitizeImage(
          bytes,
          mime,
          bytes === image && mime === 'image/png' ? 12 : 5 * 1024 * 1024,
        ),
      ).rejects.toThrow();
  });
});
