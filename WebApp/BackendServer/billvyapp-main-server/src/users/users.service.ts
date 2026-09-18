import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from '../auth/password.service';
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import { RoleCode } from '../common/enums/role.enum';
import type { RequestContext } from '../common/http/request-context';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  normalizePagination,
  paginated,
} from '../common/pagination/pagination';
import { isPrismaUniqueError } from '../common/prisma/prisma-errors';
import { ScopeService } from '../common/scope/scope.service';
import { trimOrNull, trimRequired } from '../common/strings';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const USER_SELECT = {
  id: true,
  roleId: true,
  franchiseId: true,
  salonId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  profilePhoto: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { id: true, name: true, code: true } },
  salon: { select: { id: true, name: true } },
} as const;

type UserRecord = {
  id: string;
  roleId: string;
  franchiseId: string | null;
  salonId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  profilePhoto: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  role: { id: string; name: string; code: string };
  salon?: { id: string; name: string } | null;
};

@Injectable()
export class UsersService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scope: ScopeService,
    private readonly audit: AuditService,
    private readonly passwords: PasswordService,
  ) {}

  async list(user: AuthenticatedUser, query: ListUsersQueryDto) {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();

    const where = {
      ...this.scope.userTableScope(user),
      role: { code: { not: RoleCode.CUSTOMER } },
      ...(query.roleId ? { roleId: query.roleId } : {}),
      ...(query.franchiseId ? { franchiseId: query.franchiseId } : {}),
      ...(query.salonId ? { salonId: query.salonId } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { email: { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginated(data, total, page, limit);
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<UserRecord> {
    const record = await this.prisma.user.findFirst({
      where: {
        id,
        ...this.scope.userTableScope(user),
        role: { code: { not: RoleCode.CUSTOMER } },
      },
      select: USER_SELECT,
    });

    if (!record) {
      throw new NotFoundException('User not found');
    }

    return record;
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateUserDto,
    ctx: RequestContext,
  ): Promise<UserRecord> {
    const role = await this.requirePlatformRole(dto.roleId);
    const franchiseId = dto.franchiseId ?? null;
    const salonId = dto.salonId ?? null;

    this.assertRoleScope(role.code, franchiseId, salonId);
    await this.assertFranchiseSalonPair(franchiseId, salonId);

    const passwordHash = await this.passwords.hash(dto.password);

    try {
      const created = await this.prisma.user.create({
        data: {
          roleId: role.id,
          franchiseId,
          salonId,
          firstName: trimRequired(dto.firstName),
          lastName: trimRequired(dto.lastName),
          email: dto.email.trim().toLowerCase(),
          phone: trimOrNull(dto.phone) ?? null,
          passwordHash,
          profilePhoto: trimOrNull(dto.profilePhoto) ?? null,
        },
        select: USER_SELECT,
      });

      await this.audit.record({
        userId: actor.userId,
        salonId: created.salonId,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: created.id,
        newData: {
          email: created.email,
          role: created.role.code,
          franchiseId: created.franchiseId,
          salonId: created.salonId,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return created;
    } catch (error) {
      this.rethrowUnique(error);
    }
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateUserDto,
    ctx: RequestContext,
  ): Promise<UserRecord> {
    const existing = await this.findOne(actor, id);

    if ('password' in dto || 'passwordHash' in dto) {
      throw new BadRequestException(
        'Password cannot be updated through this endpoint',
      );
    }

    const nextRoleId = dto.roleId ?? existing.roleId;
    const nextFranchiseId =
      dto.franchiseId !== undefined ? dto.franchiseId : existing.franchiseId;
    const nextSalonId =
      dto.salonId !== undefined ? dto.salonId : existing.salonId;

    const role =
      nextRoleId === existing.roleId
        ? existing.role
        : await this.requirePlatformRole(nextRoleId);

    this.assertRoleScope(role.code, nextFranchiseId, nextSalonId);
    await this.assertFranchiseSalonPair(nextFranchiseId, nextSalonId);
    await this.assertSafeMutation(actor, existing, {
      roleCode: role.code,
    });

    try {
      const updated = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          roleId: nextRoleId,
          franchiseId: nextFranchiseId,
          salonId: nextSalonId,
          ...(dto.firstName !== undefined
            ? { firstName: trimRequired(dto.firstName) }
            : {}),
          ...(dto.lastName !== undefined
            ? { lastName: trimRequired(dto.lastName) }
            : {}),
          ...(dto.email !== undefined
            ? { email: dto.email.trim().toLowerCase() }
            : {}),
          ...(dto.phone !== undefined
            ? { phone: trimOrNull(dto.phone) ?? null }
            : {}),
          ...(dto.profilePhoto !== undefined
            ? { profilePhoto: trimOrNull(dto.profilePhoto) ?? null }
            : {}),
        },
        select: USER_SELECT,
      });

      await this.audit.record({
        userId: actor.userId,
        salonId: updated.salonId,
        action: 'USER_UPDATED',
        entityType: 'User',
        entityId: updated.id,
        oldData: {
          email: existing.email,
          role: existing.role.code,
          franchiseId: existing.franchiseId,
          salonId: existing.salonId,
        },
        newData: {
          email: updated.email,
          role: updated.role.code,
          franchiseId: updated.franchiseId,
          salonId: updated.salonId,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return updated;
    } catch (error) {
      this.rethrowUnique(error);
    }
  }

  async updateStatus(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateStatusDto,
    ctx: RequestContext,
  ): Promise<UserRecord> {
    const existing = await this.findOne(actor, id);

    await this.assertSafeMutation(actor, existing, { isActive: dto.isActive });

    const updated = await this.prisma.user.update({
      where: { id: existing.id },
      data: { isActive: dto.isActive },
      select: USER_SELECT,
    });

    await this.audit.record({
      userId: actor.userId,
      salonId: updated.salonId,
      action: 'USER_STATUS_CHANGED',
      entityType: 'User',
      entityId: updated.id,
      oldData: { isActive: existing.isActive },
      newData: { isActive: updated.isActive },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return updated;
  }

  private async requirePlatformRole(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: { id: true, name: true, code: true, isActive: true },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (!role.isActive) {
      throw new BadRequestException('Role is inactive');
    }
    if ((role.code as RoleCode) === RoleCode.CUSTOMER) {
      throw new BadRequestException(
        'Customers cannot be created through this endpoint',
      );
    }

    return role;
  }

  private assertRoleScope(
    roleCode: string,
    franchiseId: string | null,
    salonId: string | null,
  ): void {
    switch (roleCode as RoleCode) {
      case RoleCode.SUPER_ADMIN:
        if (franchiseId || salonId) {
          throw new BadRequestException(
            'SUPER_ADMIN must not be assigned a franchise or salon',
          );
        }
        return;
      case RoleCode.ADMIN:
        if (!franchiseId || salonId) {
          throw new BadRequestException(
            'ADMIN requires a franchise and must not be assigned a salon',
          );
        }
        return;
      case RoleCode.MANAGER:
      case RoleCode.STAFF:
        if (!franchiseId || !salonId) {
          throw new BadRequestException(
            `${roleCode} requires both a franchise and a salon`,
          );
        }
        return;
      default:
        throw new BadRequestException('Unsupported role');
    }
  }

  private async assertFranchiseSalonPair(
    franchiseId: string | null,
    salonId: string | null,
  ): Promise<void> {
    if (franchiseId) {
      const franchise = await this.prisma.franchise.findUnique({
        where: { id: franchiseId },
        select: { id: true, isActive: true },
      });
      if (!franchise) {
        throw new NotFoundException('Franchise not found');
      }
      if (!franchise.isActive) {
        throw new BadRequestException('Franchise is inactive');
      }
    }

    if (salonId) {
      const salon = await this.prisma.salon.findUnique({
        where: { id: salonId },
        select: { id: true, franchiseId: true, isActive: true },
      });
      if (!salon) {
        throw new NotFoundException('Salon not found');
      }
      if (!salon.isActive) {
        throw new BadRequestException('Salon is inactive');
      }
      if (!franchiseId || salon.franchiseId !== franchiseId) {
        throw new BadRequestException(
          'Salon does not belong to the supplied franchise',
        );
      }
    }
  }

  private async assertSafeMutation(
    actor: AuthenticatedUser,
    target: UserRecord,
    next: { isActive?: boolean; roleCode?: string },
  ): Promise<void> {
    const isSelf = actor.userId === target.id;
    const targetIsSuperAdmin =
      (target.role.code as RoleCode) === RoleCode.SUPER_ADMIN;
    const removingAccess =
      next.isActive === false ||
      (next.roleCode !== undefined &&
        (next.roleCode as RoleCode) !== RoleCode.SUPER_ADMIN);

    if (isSelf && removingAccess && targetIsSuperAdmin) {
      throw new ForbiddenException(
        'You cannot remove your own Super Admin access',
      );
    }

    if (targetIsSuperAdmin && removingAccess) {
      const activeSuperAdmins = await this.prisma.user.count({
        where: {
          isActive: true,
          role: { code: RoleCode.SUPER_ADMIN },
        },
      });
      if (activeSuperAdmins <= 1) {
        throw new ForbiddenException('Cannot remove the last Super Admin');
      }
    }
  }

  private rethrowUnique(error: unknown): never {
    if (isPrismaUniqueError(error)) {
      const target = (error as { meta?: { target?: string | string[] } }).meta
        ?.target;
      const fields = Array.isArray(target) ? target : target ? [target] : [];
      if (fields.some((field) => field.includes('email'))) {
        throw new ConflictException('Email already exists');
      }
      if (fields.some((field) => field.includes('phone'))) {
        throw new ConflictException('Phone already exists');
      }
      throw new ConflictException('A user with these details already exists');
    }
    throw error;
  }
}
