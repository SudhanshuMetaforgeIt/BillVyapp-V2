import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Reference data for user-management screens. Not scoped: roles are global. */
  findAll() {
    return this.prisma.role.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
