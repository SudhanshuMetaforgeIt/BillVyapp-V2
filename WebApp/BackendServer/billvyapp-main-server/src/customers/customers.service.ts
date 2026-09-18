import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from '../auth/password.service';
import { UpdateStatusDto } from '../common/dto/update-status.dto';
import { Gender } from '../common/enums/gender.enum';
import { RoleCode } from '../common/enums/role.enum';
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
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

const CUSTOMER_SELECT = {
  id: true,
  userId: true,
  customerCode: true,
  dateOfBirth: true,
  gender: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      profilePhoto: true,
      isActive: true,
    },
  },
  bills: {
    select: {
      id: true,
      total: true,
      billDate: true,
      createdAt: true,
      salon: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { billDate: 'desc' as const },
  },
} as const;

type CustomerBillSummaryRow = {
  id: string;
  total: { toString(): string } | string | number;
  billDate: Date;
  createdAt: Date;
  salon?: {
    id: string;
    name: string;
  } | null;
};

type CustomerRow = {
  id: string;
  userId: string;
  customerCode: string;
  dateOfBirth: Date | null;
  gender: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    profilePhoto: string | null;
    isActive: boolean;
  };
  bills?: CustomerBillSummaryRow[];
};

export type CustomerRecord = {
  id: string;
  userId: string;
  customerCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profilePhoto: string | null;
  dateOfBirth: Date | null;
  gender: Gender | null;
  isActive: boolean;
  totalBills?: number;
  totalSpent?: string;
  lastVisit?: string | null;
  branchName?: string | null;
  salonId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class CustomersService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scope: ScopeService,
    private readonly audit: AuditService,
    private readonly passwords: PasswordService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: CustomerQueryDto,
  ): Promise<PaginatedResult<CustomerRecord>> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();

    const filters: Record<string, unknown>[] = [
      this.scope.customerTableScope(user),
    ];

    if (query.gender) {
      filters.push({ gender: query.gender });
    }
    if (query.isActive !== undefined) {
      filters.push({ user: { isActive: query.isActive } });
    }
    if (search) {
      filters.push({
        OR: [
          { customerCode: { contains: search } },
          { user: { firstName: { contains: search } } },
          { user: { lastName: { contains: search } } },
          { user: { email: { contains: search } } },
          { user: { phone: { contains: search } } },
        ],
      });
    }
    if (query.salonId && user.role !== RoleCode.CUSTOMER) {
      await this.scope.assertSalonAccess(user, query.salonId);
      filters.push(this.scope.customerSalonAssociation(query.salonId));
    }

    const where = { AND: filters };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        select: CUSTOMER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return paginated(
      rows.map((row) => this.toResponse(row)),
      total,
      page,
      limit,
    );
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<CustomerRecord> {
    const record = await this.prisma.customer.findUnique({
      where: { id },
      select: CUSTOMER_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Customer not found');
    }

    await this.scope.assertCustomerAccess(user, record.id);
    return this.toResponse(record);
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateCustomerDto,
    ctx: RequestContext,
  ): Promise<CustomerRecord> {
    const phone = dto.phone.trim();
    const email = dto.email.trim().toLowerCase();
    const firstName = trimRequired(dto.firstName);
    const lastName = trimRequired(dto.lastName);
    const profilePhoto = trimOrNull(dto.profilePhoto) ?? null;
    const dateOfBirth = dto.dateOfBirth ?? null;
    const gender = dto.gender ?? null;

    const [existingByPhone, existingByEmail, customerRole] = await Promise.all([
      this.prisma.user.findUnique({
        where: { phone },
        select: {
          id: true,
          email: true,
          customer: { select: { id: true } },
          role: { select: { code: true } },
        },
      }),
      this.prisma.user.findUnique({
        where: { email },
        select: { id: true, phone: true },
      }),
      this.prisma.role.findUnique({
        where: { code: RoleCode.CUSTOMER },
        select: { id: true, isActive: true },
      }),
    ]);

    if (!customerRole?.isActive) {
      throw new BadRequestException('CUSTOMER role is not configured');
    }

    if (existingByEmail && existingByEmail.id !== existingByPhone?.id) {
      throw new ConflictException('Email already exists');
    }

    if (existingByPhone?.customer) {
      throw new ConflictException('Phone already exists');
    }

    if (
      existingByPhone &&
      (existingByPhone.role.code as RoleCode) !== RoleCode.CUSTOMER
    ) {
      throw new ConflictException('Phone already belongs to a staff account');
    }

    try {
      const created = existingByPhone
        ? await this.linkExistingUser({
            userId: existingByPhone.id,
            firstName,
            lastName,
            email,
            phone,
            profilePhoto,
            dateOfBirth,
            gender,
          })
        : await this.createUserAndCustomer({
            roleId: customerRole.id,
            firstName,
            lastName,
            email,
            phone,
            profilePhoto,
            dateOfBirth,
            gender,
          });

      await this.audit.record({
        userId: actor.userId,
        action: 'CUSTOMER_CREATED',
        entityType: 'Customer',
        entityId: created.id,
        newData: {
          customerCode: created.customerCode,
          userId: created.userId,
          phone: created.user.phone,
          email: created.user.email,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return this.toResponse(created);
    } catch (error) {
      this.rethrowUnique(error);
    }
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateCustomerDto,
    ctx: RequestContext,
  ): Promise<CustomerRecord> {
    const existing = await this.requireCustomer(id);
    await this.scope.assertCustomerAccess(actor, existing.id);

    const userData: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      profilePhoto?: string | null;
    } = {};
    const customerData: {
      dateOfBirth?: Date | null;
      gender?: Gender | null;
    } = {};

    if (dto.firstName !== undefined) {
      userData.firstName = trimRequired(dto.firstName);
    }
    if (dto.lastName !== undefined) {
      userData.lastName = trimRequired(dto.lastName);
    }
    if (dto.email !== undefined) {
      userData.email = dto.email.trim().toLowerCase();
    }
    if (dto.phone !== undefined) {
      userData.phone = dto.phone.trim();
    }
    if (dto.profilePhoto !== undefined) {
      userData.profilePhoto = trimOrNull(dto.profilePhoto) ?? null;
    }
    if (dto.dateOfBirth !== undefined) {
      customerData.dateOfBirth = dto.dateOfBirth;
    }
    if (dto.gender !== undefined) {
      customerData.gender = dto.gender;
    }

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (Object.keys(userData).length > 0) {
          await tx.user.update({
            where: { id: existing.userId },
            data: userData,
          });
        }
        return tx.customer.update({
          where: { id: existing.id },
          data: customerData,
          select: CUSTOMER_SELECT,
        });
      });

      await this.audit.record({
        userId: actor.userId,
        action: 'CUSTOMER_UPDATED',
        entityType: 'Customer',
        entityId: updated.id,
        oldData: {
          firstName: existing.user.firstName,
          lastName: existing.user.lastName,
          email: existing.user.email,
          phone: existing.user.phone,
        },
        newData: {
          firstName: updated.user.firstName,
          lastName: updated.user.lastName,
          email: updated.user.email,
          phone: updated.user.phone,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return this.toResponse(updated);
    } catch (error) {
      this.rethrowUnique(error);
    }
  }

  async updateStatus(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateStatusDto,
    ctx: RequestContext,
  ): Promise<CustomerRecord> {
    const existing = await this.requireCustomer(id);
    await this.scope.assertCustomerAccess(actor, existing.id);

    await this.prisma.user.update({
      where: { id: existing.userId },
      data: { isActive: dto.isActive },
    });

    const updated = await this.requireCustomer(id);

    await this.audit.record({
      userId: actor.userId,
      action: 'CUSTOMER_STATUS_CHANGED',
      entityType: 'Customer',
      entityId: updated.id,
      oldData: { isActive: existing.user.isActive },
      newData: { isActive: updated.user.isActive },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toResponse(updated);
  }

  private async requireCustomer(id: string): Promise<CustomerRow> {
    const record = await this.prisma.customer.findUnique({
      where: { id },
      select: CUSTOMER_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Customer not found');
    }

    return record;
  }

  private async createUserAndCustomer(input: {
    roleId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    profilePhoto: string | null;
    dateOfBirth: Date | null;
    gender: Gender | null;
  }): Promise<CustomerRow> {
    const passwordHash = await this.passwords.hash(
      randomBytes(32).toString('base64url'),
    );
    const customerCode = this.nextCustomerCode();

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          roleId: input.roleId,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          passwordHash,
          profilePhoto: input.profilePhoto,
        },
        select: { id: true },
      });

      return tx.customer.create({
        data: {
          userId: user.id,
          customerCode,
          dateOfBirth: input.dateOfBirth,
          gender: input.gender,
        },
        select: CUSTOMER_SELECT,
      });
    });
  }

  private async linkExistingUser(input: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    profilePhoto: string | null;
    dateOfBirth: Date | null;
    gender: Gender | null;
  }): Promise<CustomerRow> {
    const customerCode = this.nextCustomerCode();

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: input.userId },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          profilePhoto: input.profilePhoto,
        },
      });

      return tx.customer.create({
        data: {
          userId: input.userId,
          customerCode,
          dateOfBirth: input.dateOfBirth,
          gender: input.gender,
        },
        select: CUSTOMER_SELECT,
      });
    });
  }

  private nextCustomerCode(): string {
    return `CUST-${randomBytes(4).toString('hex').toUpperCase()}`;
  }

  private toResponse(row: CustomerRow): CustomerRecord {
    const bills = row.bills || [];
    const totalBills = bills.length;
    let totalSpentNum = 0;
    for (const b of bills) {
      totalSpentNum += Number(b.total?.toString() || 0);
    }
    const latestBill = bills[0];
    const lastVisit = latestBill
      ? latestBill.billDate
        ? latestBill.billDate.toISOString().slice(0, 10)
        : latestBill.createdAt.toISOString().slice(0, 10)
      : null;
    const branchName = latestBill?.salon?.name ?? null;
    const salonId = latestBill?.salon?.id ?? null;

    return {
      id: row.id,
      userId: row.userId,
      customerCode: row.customerCode,
      firstName: row.user.firstName,
      lastName: row.user.lastName,
      email: row.user.email,
      phone: row.user.phone ?? '',
      profilePhoto: row.user.profilePhoto,
      dateOfBirth: row.dateOfBirth,
      gender: row.gender as Gender | null,
      isActive: row.user.isActive,
      totalBills,
      totalSpent: totalSpentNum.toFixed(2),
      lastVisit,
      branchName,
      salonId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
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
      if (fields.some((field) => field.includes('customerCode'))) {
        throw new ConflictException('Customer code already exists');
      }
      throw new ConflictException(
        'A customer with these details already exists',
      );
    }
    throw error;
  }
}
