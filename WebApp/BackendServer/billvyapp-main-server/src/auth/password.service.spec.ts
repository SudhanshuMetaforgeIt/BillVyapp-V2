import { BadRequestException } from '@nestjs/common';
import { PasswordService } from './password.service';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_PLATFORM_SETTINGS } from '../settings/settings.constants';

jest.mock('../prisma/prisma.service', () => ({ PrismaService: class {} }));

describe('Database password policy', () => {
  const findUnique = jest.fn();
  const service = new PasswordService({
    platformSettings: { findUnique },
  } as unknown as PrismaService);
  beforeEach(() =>
    findUnique.mockResolvedValue({
      ...DEFAULT_PLATFORM_SETTINGS,
      passwordRequireSpecial: true,
    }),
  );

  it.each([
    'short',
    'lowercase123!',
    'UPPERCASE123!',
    'NoNumbers!!!',
    'NoSpecial123',
  ])('rejects a password missing a configured rule: %s', async (password) => {
    await expect(service.assertPolicy(password)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
  it('reads changed minimum length and flags directly from the database', async () => {
    await expect(service.assertPolicy('Valid@123')).resolves.toBeUndefined();
    findUnique.mockResolvedValue({
      ...DEFAULT_PLATFORM_SETTINGS,
      passwordMinLength: 12,
    });
    await expect(service.assertPolicy('Valid@123')).rejects.toThrow(
      'at least 12',
    );
    findUnique.mockResolvedValue({
      passwordMinLength: 6,
      passwordRequireUppercase: false,
      passwordRequireLowercase: false,
      passwordRequireNumbers: false,
      passwordRequireSpecial: false,
    });
    await expect(service.assertPolicy('simple')).resolves.toBeUndefined();
  });
  it('hashes login burn values and OTPs without applying the new-password policy', async () => {
    findUnique.mockClear();
    const hash = await service.hash('123456');
    await expect(service.verify(hash, '123456')).resolves.toBe(true);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
