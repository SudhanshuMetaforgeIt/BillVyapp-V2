import { ConfigService } from '@nestjs/config';
import { SalonImageStorageService } from './salon-image-storage.service';
import { CloudinarySalonImageProvider } from './storage/cloudinary-salon-image.provider';

describe('Salon server-upload storage facade', () => {
  function setup() {
    const adapter = {
      providerName: 'CLOUDINARY',
      createUpload: jest
        .fn()
        .mockResolvedValue({ storageKey: 'salons/s1/key' }),
      uploadObject: jest.fn().mockResolvedValue(undefined),
      getImage: jest.fn().mockResolvedValue({
        storageKey: 'salons/s1/key',
        fileName: 'provider-name.png',
        mimeType: 'image/png',
        fileSize: 20,
      }),
      deleteImage: jest.fn().mockResolvedValue(undefined),
      getDeliveryUrl: jest
        .fn()
        .mockReturnValue('https://example.com/uncropped'),
    };
    const config = { get: jest.fn().mockReturnValue('cloudinary') };
    return {
      adapter,
      storage: new SalonImageStorageService(
        config as unknown as ConfigService,
        adapter as unknown as CloudinarySalonImageProvider,
      ),
    };
  }
  it('reuses the existing adapter and preserves the submitted original filename', async () => {
    const { adapter, storage } = setup();
    const bytes = Buffer.from('image');
    const result = await storage.uploadImage({
      salonId: 's1',
      fileName: 'salon.png',
      mimeType: 'image/png',
      bytes,
    });
    expect(adapter.uploadObject).toHaveBeenCalledWith(
      'salons/s1/key',
      bytes,
      'image/png',
    );
    expect(adapter.getImage).toHaveBeenCalledWith('salons/s1/key');
    expect(result.fileName).toBe('salon.png');
    expect(adapter.deleteImage).not.toHaveBeenCalled();
  });
  it('cleans up an unverified upload without returning success', async () => {
    const { adapter, storage } = setup();
    adapter.getImage.mockRejectedValue(new Error('invalid image'));
    await expect(
      storage.uploadImage({
        salonId: 's1',
        fileName: 'salon.png',
        mimeType: 'image/png',
        bytes: Buffer.from('image'),
      }),
    ).rejects.toThrow('invalid image');
    expect(adapter.deleteImage).toHaveBeenCalledWith('salons/s1/key');
  });

  it('rejects verified content that does not match the declared MIME type', async () => {
    const { adapter, storage } = setup();
    await expect(
      storage.uploadImage({
        salonId: 's1',
        fileName: 'salon.jpg',
        mimeType: 'image/jpeg',
        bytes: Buffer.from('image'),
      }),
    ).rejects.toThrow('declared type');
    expect(adapter.deleteImage).toHaveBeenCalledWith('salons/s1/key');
  });

  it.each([true, false])(
    'refreshes old URLs without leaking keys (primary=%s)',
    (isPrimary) => {
      const { adapter, storage } = setup();
      const result = storage.toPublicPhoto({
        id: 'p1',
        storageProvider: 'CLOUDINARY',
        storageKey: 'salons/s1/key',
        fileUrl: 'https://example.com/old-crop',
        isPrimary,
      });
      expect(result.fileUrl).toBe('https://example.com/uncropped');
      expect(result).not.toHaveProperty('storageKey');
      expect(result).not.toHaveProperty('storageProvider');
      expect(adapter.getDeliveryUrl).toHaveBeenCalledWith({
        storageKey: 'salons/s1/key',
        variant: isPrimary ? 'cover' : 'gallery',
      });
    },
  );
  it('does not reinterpret legacy images owned by a different provider', () => {
    const { adapter, storage } = setup();
    const result = storage.toPublicPhoto({
      storageProvider: 'S3',
      storageKey: 'legacy/key',
      fileUrl: 'https://example.com/legacy',
      isPrimary: true,
    });
    expect(result.fileUrl).toBe('https://example.com/legacy');
    expect(adapter.getDeliveryUrl).not.toHaveBeenCalled();
  });
});
