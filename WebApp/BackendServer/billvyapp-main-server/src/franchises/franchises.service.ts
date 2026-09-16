import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import type { RequestContext } from '../common/http/request-context';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  normalizePagination,
  paginated,
  PaginatedResult,
} from '../common/pagination/pagination';
import { isPrismaUniqueError } from '../common/prisma/prisma-errors';
import { ScopeService } from '../common/scope/scope.service';
import { trimOrNull, trimRequired } from '../common/strings';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFranchiseDto } from './dto/create-franchise.dto';
import { ListFranchisesQueryDto } from './dto/list-franchises-query.dto';
import { UpdateFranchiseDto } from './dto/update-franchise.dto';
import { UpdateStatusDto } from '../common/dto/update-status.dto';

const FRANCHISE_SELECT = {
  id: true,
  name: true,
  code: true,
  phone: true,
  email: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type FranchiseRecord = {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class FranchisesService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: ListFranchisesQueryDto,
  ): Promise<PaginatedResult<FranchiseRecord>> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();

    const where = {
      ...this.scope.franchiseTableScope(user),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { code: { contains: search } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.franchise.findMany({
        where,
        select: FRANCHISE_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.franchise.count({ where }),
    ]);

    return paginated(data, total, page, limit);
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<FranchiseRecord> {
    const franchise = await this.prisma.franchise.findFirst({
      where: { id, ...this.scope.franchiseTableScope(user) },
      select: FRANCHISE_SELECT,
    });

    if (!franchise) {
      throw new NotFoundException('Franchise not found');
    }

    return franchise;
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateFranchiseDto,
    ctx: RequestContext,
  ): Promise<FranchiseRecord> {
    const code = trimRequired(dto.code);

    try {
      const created = await this.prisma.franchise.create({
        data: {
          name: trimRequired(dto.name),
          code,
          phone: trimOrNull(dto.phone) ?? null,
          email: trimOrNull(dto.email) ?? null,
        },
        select: FRANCHISE_SELECT,
      });

      await this.audit.record({
        userId: user.userId,
        action: 'FRANCHISE_CREATED',
        entityType: 'Franchise',
        entityId: created.id,
        newData: { name: created.name, code: created.code },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return created;
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new ConflictException('Franchise code already exists');
      }
      throw error;
    }
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateFranchiseDto,
    ctx: RequestContext,
  ): Promise<FranchiseRecord> {
    const existing = await this.findOne(user, id);

    const data: {
      name?: string;
      code?: string;
      phone?: string | null;
      email?: string | null;
    } = {};

    if (dto.name !== undefined) data.name = trimRequired(dto.name);
    if (dto.code !== undefined) data.code = trimRequired(dto.code);
    if (dto.phone !== undefined) data.phone = trimOrNull(dto.phone) ?? null;
    if (dto.email !== undefined) data.email = trimOrNull(dto.email) ?? null;

    try {
      const updated = await this.prisma.franchise.update({
        where: { id: existing.id },
        data,
        select: FRANCHISE_SELECT,
      });

      await this.audit.record({
        userId: user.userId,
        action: 'FRANCHISE_UPDATED',
        entityType: 'Franchise',
        entityId: updated.id,
        oldData: { name: existing.name, code: existing.code },
        newData: { name: updated.name, code: updated.code },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return updated;
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new ConflictException('Franchise code already exists');
      }
      throw error;
    }
  }

  async updateStatus(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateStatusDto,
    ctx: RequestContext,
  ): Promise<FranchiseRecord> {
    const existing = await this.findOne(user, id);

    const updated = await this.prisma.franchise.update({
      where: { id: existing.id },
      data: { isActive: dto.isActive },
      select: FRANCHISE_SELECT,
    });

    await this.audit.record({
      userId: user.userId,
      action: 'FRANCHISE_STATUS_CHANGED',
      entityType: 'Franchise',
      entityId: updated.id,
      oldData: { isActive: existing.isActive },
      newData: { isActive: updated.isActive },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return updated;
  }
}
