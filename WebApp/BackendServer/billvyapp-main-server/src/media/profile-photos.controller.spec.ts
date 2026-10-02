import type { Response } from 'express';
import { ForbiddenException } from '@nestjs/common';
import { ProfileAvatarController } from './profile-photos.controller';
import { ProfilePhotosService } from './profile-photos.service';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

describe('Profile avatar response', () => {
  it('permits image embedding across origins after capability validation', async () => {
    const bytes = Buffer.from('avatar');
    const readDisplayImage = jest.fn().mockResolvedValue({
      bytes,
      mimeType: 'image/png',
    });
    const controller = new ProfileAvatarController({
      readDisplayImage,
    } as unknown as ProfilePhotosService);
    const setHeader = jest.fn();
    const send = jest.fn();

    await controller.display('media-id', 'signature', {
      setHeader,
      send,
    } as unknown as Response);

    expect(readDisplayImage).toHaveBeenCalledWith('media-id', 'signature');
    expect(setHeader).toHaveBeenCalledWith(
      'Cross-Origin-Resource-Policy',
      'cross-origin',
    );
    expect(setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
    expect(setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'private, no-store',
    );
    expect(setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(send).toHaveBeenCalledWith(bytes);
  });

  it('does not send image bytes when capability validation fails', async () => {
    const controller = new ProfileAvatarController({
      readDisplayImage: jest.fn().mockRejectedValue(new ForbiddenException()),
    } as unknown as ProfilePhotosService);
    const setHeader = jest.fn();
    const send = jest.fn();

    await expect(
      controller.display('media-id', 'invalid', {
        setHeader,
        send,
      } as unknown as Response),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(setHeader).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
