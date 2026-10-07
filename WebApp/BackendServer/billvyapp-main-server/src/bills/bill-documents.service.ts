import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { RoleCode } from '../common/enums/role.enum';
import type { RequestContext } from '../common/http/request-context';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  normalizePagination,
  paginated,
  PaginatedResult,
} from '../common/pagination/pagination';
import { ScopeService } from '../common/scope/scope.service';
import { trimOrNull } from '../common/strings';
import { ObjectStorageService } from '../media/object-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBillDocumentDto } from './dto/create-bill-document.dto';

const DOCUMENT_SELECT = {
  id: true,
  billId: true,
  storageKey: true,
  fileName: true,
  fileUrl: true,
  mimeType: true,
  fileSize: true,
  createdAt: true,
  updatedAt: true,
} as const;

const BILL_ACCESS_SELECT = {
  id: true,
  salonId: true,
  customerId: true,
} as const;

export type BillDocumentRecord = {
  id: string;
  billId: string;
  storageKey: string;
  fileName: string;
  fileUrl: string | null;
  mimeType: string;
  fileSize: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class BillDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly audit: AuditService,
    private readonly storage: ObjectStorageService,
  ) {}

  async list(
    user: AuthenticatedUser,
    billId: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResult<BillDocumentRecord>> {
    await this.requireBillAccess(user, billId);
    const pagination = normalizePagination(page, limit);
    const where = { billId };

    const [rows, total] = await Promise.all([
      this.prisma.billDocument.findMany({
        where,
        select: DOCUMENT_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      this.prisma.billDocument.count({ where }),
    ]);

    return paginated(rows, total, pagination.page, pagination.limit);
  }

  async findOne(
    user: AuthenticatedUser,
    billId: string,
    id: string,
  ): Promise<BillDocumentRecord> {
    await this.requireBillAccess(user, billId);
    return this.requireDocument(billId, id);
  }

  async createDownloadUrl(
    user: AuthenticatedUser,
    billId: string,
    id: string,
  ): Promise<{ storageKey: string; downloadUrl: string; expiresInSeconds: number }> {
    await this.requireBillAccess(user, billId);
    const document = await this.requireDocument(billId, id);
    const download = await this.storage.createDownloadUrl(document.storageKey);
    return {
      storageKey: download.storageKey,
      downloadUrl: download.downloadUrl,
      expiresInSeconds: download.expiresInSeconds ?? 900,
    };
  }

  async create(
    actor: AuthenticatedUser,
    billId: string,
    dto: CreateBillDocumentDto,
    ctx: RequestContext,
  ): Promise<BillDocumentRecord> {
    const bill = await this.requireBillAccess(actor, billId);
    const media = await this.requireMediaAccess(actor, dto.mediaFileId);

    const created = await this.prisma.billDocument.create({
      data: {
        billId,
        storageKey: media.storageKey,
        fileName: media.originalFileName,
        mimeType: media.mimeType,
        fileSize: media.fileSize,
        fileUrl: trimOrNull(dto.fileUrl) ?? null,
      },
      select: DOCUMENT_SELECT,
    });

    await this.audit.record({
      userId: actor.userId,
      salonId: bill.salonId,
      action: 'BILL_DOCUMENT_CREATED',
      entityType: 'BillDocument',
      entityId: created.id,
      newData: {
        billId,
        mediaFileId: media.id,
        storageKey: created.storageKey,
        fileName: created.fileName,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return created;
  }

  async remove(
    actor: AuthenticatedUser,
    billId: string,
    id: string,
    ctx: RequestContext,
  ): Promise<{ id: string; deleted: true }> {
    const bill = await this.requireBillAccess(actor, billId);
    const existing = await this.requireDocument(billId, id);

    await this.prisma.billDocument.delete({ where: { id } });

    await this.audit.record({
      userId: actor.userId,
      salonId: bill.salonId,
      action: 'BILL_DOCUMENT_DELETED',
      entityType: 'BillDocument',
      entityId: id,
      oldData: {
        billId: existing.billId,
        storageKey: existing.storageKey,
        fileName: existing.fileName,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { id, deleted: true };
  }

  private async requireBillAccess(
    user: AuthenticatedUser,
    billId: string,
  ): Promise<{ id: string; salonId: string; customerId: string }> {
    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
      select: BILL_ACCESS_SELECT,
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (user.role === RoleCode.CUSTOMER) {
      await this.scope.assertOwnCustomerAccess(user, bill.customerId);
    } else {
      await this.scope.assertSalonAccess(user, bill.salonId);
    }

    return bill;
  }

  private async requireDocument(
    billId: string,
    id: string,
  ): Promise<BillDocumentRecord> {
    const document = await this.prisma.billDocument.findFirst({
      where: { id, billId },
      select: DOCUMENT_SELECT,
    });

    if (!document) {
      throw new NotFoundException('Bill document not found');
    }

    return document;
  }

  private async requireMediaAccess(
    user: AuthenticatedUser,
    mediaFileId: string,
  ): Promise<{
    id: string;
    storageKey: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
    salonId: string | null;
    uploadedBy: string | null;
  }> {
    const media = await this.prisma.mediaFile.findUnique({
      where: { id: mediaFileId },
      select: {
        id: true,
        storageKey: true,
        entityType: true,
        originalFileName: true,
        mimeType: true,
        fileSize: true,
        salonId: true,
        uploadedBy: true,
      },
    });

    if (!media) {
      throw new NotFoundException('Media file not found');
    }

    if (media.entityType?.startsWith('ProfilePhoto')) {
      throw new ForbiddenException('Profile images cannot be attached as private documents');
    }

    if (user.role === RoleCode.CUSTOMER) {
      if (media.uploadedBy !== user.userId) {
        throw new ForbiddenException('Media file outside your scope');
      }
      return media;
    }

    if (media.salonId) {
      await this.scope.assertSalonAccess(user, media.salonId);
    } else if (
      (user.role === RoleCode.MANAGER || user.role === RoleCode.STAFF) &&
      media.uploadedBy !== user.userId
    ) {
      throw new ForbiddenException('Media file outside your scope');
    }

    return media;
  }
}
