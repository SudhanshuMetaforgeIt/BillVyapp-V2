import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const ROLE_SELECT = {
  id: true,
  name: true,
  code: true,
  description: true,
  isActive: true,
} as const;

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.role.findMany({
      select: ROLE_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      select: ROLE_SELECT,
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }
}
