import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UploadSalonPhotoDto } from './upload-salon-photo.dto';

describe('Salon server upload query validation', () => {
  const metadata = {
    fileName: 'salon.png',
    mimeType: 'image/png',
    photoType: 'INTERIOR',
    displayOrder: '2',
    isPrimary: 'false',
  };
  it('retains explicit false instead of implicitly converting the string to true', async () => {
    const dto = plainToInstance(UploadSalonPhotoDto, metadata, {
      enableImplicitConversion: true,
    });
    expect(dto.isPrimary).toBe('false');
    expect(dto.displayOrder).toBe(2);
    expect(await validate(dto)).toHaveLength(0);
  });
  it.each([
    'INTERIOR',
    'FRONT',
    'SERVICE_AREA',
    'OTHER',
    'RECEPTION',
    'WAITING_AREA',
  ])('accepts the existing %s photo type', async (photoType) => {
    expect(
      await validate(
        plainToInstance(UploadSalonPhotoDto, { ...metadata, photoType }),
      ),
    ).toHaveLength(0);
  });
  it.each([
    { photoType: 'TEAM' },
    { photoType: 'COVER' },
    { displayOrder: '10001' },
    { displayOrder: '-1' },
    { mimeType: 'application/pdf' },
    { isPrimary: 'anything' },
    { replaceId: 'not-a-uuid' },
  ])('rejects invalid metadata %j', async (invalid) => {
    const errors = await validate(
      plainToInstance(
        UploadSalonPhotoDto,
        { ...metadata, ...invalid },
        { enableImplicitConversion: true },
      ),
    );
    expect(errors.length).toBeGreaterThan(0);
  });
  it('rejects provider keys and caller-supplied identity', async () => {
    const errors = await validate(
      plainToInstance(UploadSalonPhotoDto, {
        ...metadata,
        storageKey: 'other/key',
        salonId: 'other-salon',
      }),
      { whitelist: true, forbidNonWhitelisted: true },
    );
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['storageKey', 'salonId']),
    );
  });
});
