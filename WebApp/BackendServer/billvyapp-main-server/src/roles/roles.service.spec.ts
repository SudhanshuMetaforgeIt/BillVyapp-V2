import { NotFoundException } from '@nestjs/common';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { RoleCode } from '../common/enums/role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('RolesService', () => {
  const prisma = {
    role: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  let service: RolesService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new RolesService(prisma as unknown as PrismaService);
  });

  it('lists roles including isActive', async () => {
    prisma.role.findMany.mockResolvedValue([
      {
        id: 'r1',
        name: 'Admin',
        code: 'ADMIN',
        description: null,
        isActive: true,
      },
    ]);

    const result = await service.findAll();
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'r1',
        code: 'ADMIN',
        isActive: true,
      }),
    );
  });

  it('returns role detail', async () => {
    prisma.role.findUnique.mockResolvedValue({
      id: 'r1',
      name: 'Admin',
      code: 'ADMIN',
      description: 'Franchise admin',
      isActive: true,
    });

    await expect(service.findOne('r1')).resolves.toMatchObject({ id: 'r1' });
  });

  it('throws when a role is missing', async () => {
    prisma.role.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('RolesController authorization', () => {
  it('requires SUPER_ADMIN', () => {
    expect(Reflect.getMetadata(ROLES_KEY, RolesController)).toEqual([
      RoleCode.SUPER_ADMIN,
    ]);
  });
});
