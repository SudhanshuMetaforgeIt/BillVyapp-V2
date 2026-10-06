import { describe, expect, it } from 'vitest';
import { cloudinaryImageLoader, isCloudinaryImage } from './cloudinary-image';

describe('cloudinary image delivery', () => {
  it('replaces the backend gallery transform with a responsive width', () => {
    const src = 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_1200,h_1200,c_limit/salons/s1/photo';
    expect(cloudinaryImageLoader({ src, width: 384, quality: 75 })).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_75,w_384,c_limit/salons/s1/photo',
    );
  });

  it('preserves face cropping for avatars and leaves other hosts untouched', () => {
    const src = 'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_512,h_512,c_fill,g_face/profiles/u1';
    expect(cloudinaryImageLoader({ src, width: 48, quality: 75 })).toContain('w_48,h_48,c_fill,g_face');
    expect(isCloudinaryImage('https://example.com/image.png')).toBe(false);
    expect(cloudinaryImageLoader({ src: 'https://example.com/image.png', width: 48, quality: 75 })).toBe('https://example.com/image.png');
  });
});
