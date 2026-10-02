import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService, type AuditAction } from '../audit/audit.service';
import { RoleCode } from '../common/enums/role.enum';
import type { RequestContext } from '../common/http/request-context';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { normalizePagination, paginated, type PaginatedResult } from '../common/pagination/pagination';
import { ScopeService } from '../common/scope/scope.service';
import { trimOrNull, trimRequired } from '../common/strings';
import { PrismaService } from '../prisma/prisma.service';
import { CampaignQueryDto } from './dto/campaign-query.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

const SELECT = {
  id: true, salonId: true, createdById: true, name: true, description: true,
  type: true, targetAudience: true, startDate: true, endDate: true, status: true,
  offerDescription: true, promotionalMediaFileId: true, message: true,
  deliveryChannels: true, createdAt: true, updatedAt: true,
  salon: { select: { id: true, name: true, franchiseId: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService, private readonly scope: ScopeService, private readonly audit: AuditService) {}

  async list(user: AuthenticatedUser, query: CampaignQueryDto): Promise<PaginatedResult<unknown>> {
    await this.refreshLifecycle();
    if (query.salonId) await this.scope.assertSalonAccess(user, query.salonId);
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const search = query.search?.trim();
    const where = {
      ...this.scope.salonScope(user),
      ...(query.salonId ? { salonId: query.salonId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search ? { OR: [{ name: { contains: search } }, { description: { contains: search } }, { offerDescription: { contains: search } }] } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.campaign.findMany({ where, select: SELECT, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      this.prisma.campaign.count({ where }),
    ]);
    return paginated(rows.map((row) => this.toResponse(row)), total, page, limit);
  }

  async findOne(user: AuthenticatedUser, id: string) {
    await this.refreshLifecycle();
    return this.toResponse(await this.requireReadable(user, id));
  }

  async create(actor: AuthenticatedUser, dto: CreateCampaignDto, ctx: RequestContext) {
    await this.scope.assertSalonAccess(actor, dto.salonId);
    this.assertDates(dto.startDate, dto.endDate, false);
    await this.assertMedia(dto.promotionalMediaFileId, dto.salonId);
    const created = await this.prisma.campaign.create({
      data: {
        salonId: dto.salonId, createdById: actor.userId, name: trimRequired(dto.name),
        description: trimOrNull(dto.description) ?? null, type: dto.type,
        targetAudience: dto.targetAudience, startDate: dto.startDate ?? null, endDate: dto.endDate ?? null,
        offerDescription: trimOrNull(dto.offerDescription) ?? null,
        promotionalMediaFileId: dto.promotionalMediaFileId ?? null,
        message: trimOrNull(dto.message) ?? null, deliveryChannels: [...new Set(dto.deliveryChannels)],
      }, select: SELECT,
    });
    await this.record(actor, created, 'CAMPAIGN_CREATED', ctx, undefined, { status: created.status, name: created.name });
    return this.toResponse(created);
  }

  async update(actor: AuthenticatedUser, id: string, dto: UpdateCampaignDto, ctx: RequestContext) {
    const existing = await this.requireWritable(actor, id);
    if (existing.status !== 'DRAFT' && existing.status !== 'SCHEDULED') throw new ConflictException('Only draft or scheduled campaigns can be edited');
    if (dto.salonId !== undefined && dto.salonId !== existing.salonId) throw new BadRequestException('Campaign salon cannot be changed');
    const startDate = dto.startDate === undefined ? existing.startDate : dto.startDate;
    const endDate = dto.endDate === undefined ? existing.endDate : dto.endDate;
    this.assertDates(startDate, endDate, existing.status === 'SCHEDULED');
    if (dto.promotionalMediaFileId !== undefined) await this.assertMedia(dto.promotionalMediaFileId, existing.salonId);
    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = trimRequired(dto.name);
    for (const key of ['description', 'offerDescription', 'message'] as const) if (dto[key] !== undefined) data[key] = trimOrNull(dto[key]) ?? null;
    for (const key of ['type', 'targetAudience', 'startDate', 'endDate', 'promotionalMediaFileId'] as const) if (dto[key] !== undefined) data[key] = dto[key];
    if (dto.deliveryChannels !== undefined) data.deliveryChannels = [...new Set(dto.deliveryChannels)];
    const updated = await this.prisma.campaign.update({ where: { id }, data, select: SELECT });
    await this.record(actor, updated, 'CAMPAIGN_UPDATED', ctx, { status: existing.status, name: existing.name }, { status: updated.status, name: updated.name });
    return this.toResponse(updated);
  }

  async publish(actor: AuthenticatedUser, id: string, target: 'SCHEDULED' | 'ACTIVE', ctx: RequestContext) {
    const existing = await this.requireWritable(actor, id);
    if (existing.status !== 'DRAFT') throw new ConflictException('Only draft campaigns can be published');
    this.assertDates(existing.startDate, existing.endDate, true);
    const now = new Date();
    if (target === 'SCHEDULED' && existing.startDate! <= now) throw new BadRequestException('Scheduled campaigns require a future start date');
    if (target === 'ACTIVE' && existing.startDate! > now) throw new BadRequestException('Campaign start date has not arrived');
    const updated = await this.prisma.campaign.update({ where: { id }, data: { status: target }, select: SELECT });
    await this.record(actor, updated, 'CAMPAIGN_PUBLISHED', ctx, { status: existing.status }, { status: target });
    return this.toResponse(updated);
  }

  async cancel(actor: AuthenticatedUser, id: string, ctx: RequestContext) {
    const existing = await this.requireWritable(actor, id);
    if (!['DRAFT', 'SCHEDULED', 'ACTIVE'].includes(existing.status)) throw new ConflictException('Campaign cannot be cancelled in its current state');
    const updated = await this.prisma.campaign.update({ where: { id }, data: { status: 'CANCELLED' }, select: SELECT });
    await this.record(actor, updated, 'CAMPAIGN_CANCELLED', ctx, { status: existing.status }, { status: 'CANCELLED' });
    return this.toResponse(updated);
  }

  async remove(actor: AuthenticatedUser, id: string, ctx: RequestContext) {
    const existing = await this.requireWritable(actor, id);
    if (!['DRAFT', 'CANCELLED'].includes(existing.status)) throw new ConflictException('Only draft or cancelled campaigns can be deleted');
    await this.prisma.campaign.delete({ where: { id } });
    await this.record(actor, existing, 'CAMPAIGN_DELETED', ctx, { status: existing.status, name: existing.name }, undefined);
    return { id, deleted: true };
  }

  private async requireReadable(user: AuthenticatedUser, id: string): Promise<any> {
    const row = await this.prisma.campaign.findUnique({ where: { id }, select: SELECT });
    if (!row) throw new NotFoundException('Campaign not found');
    await this.scope.assertSalonAccess(user, row.salonId);
    return row;
  }
  private async requireWritable(user: AuthenticatedUser, id: string): Promise<any> { return this.requireReadable(user, id); }
  private assertDates(start: Date | null | undefined, end: Date | null | undefined, required: boolean) {
    if (required && (!start || !end)) throw new BadRequestException('Start and end dates are required to schedule or publish a campaign');
    if ((start && !end) || (!start && end)) throw new BadRequestException('Start and end dates must be supplied together');
    if (start && end && end <= start) throw new BadRequestException('End date must be after start date');
  }
  private async assertMedia(mediaId: string | null | undefined, salonId: string) {
    if (!mediaId) return;
    const media = await this.prisma.mediaFile.findUnique({ where: { id: mediaId }, select: { salonId: true, entityType: true } });
    if (!media) throw new NotFoundException('Promotional media not found');
    if (media.salonId !== salonId || media.entityType?.startsWith('ProfilePhoto')) throw new BadRequestException('Promotional media must belong to the campaign salon');
  }
  private async refreshLifecycle() {
    const now = new Date();
    await this.prisma.campaign.updateMany({ where: { status: 'SCHEDULED', startDate: { lte: now }, endDate: { gt: now } }, data: { status: 'ACTIVE' } });
    await this.prisma.campaign.updateMany({ where: { status: { in: ['SCHEDULED', 'ACTIVE'] }, endDate: { lte: now } }, data: { status: 'COMPLETED' } });
  }
  private async record(actor: AuthenticatedUser, campaign: any, action: AuditAction, ctx: RequestContext, oldData?: object, newData?: object) {
    await this.audit.record({ userId: actor.userId, salonId: campaign.salonId, action, entityType: 'Campaign', entityId: campaign.id, oldData, newData, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent });
  }
  private toResponse(row: any) { return { ...row, deliveryChannels: Array.isArray(row.deliveryChannels) ? row.deliveryChannels : [], createdBy: row.createdBy ? { id: row.createdBy.id, name: `${row.createdBy.firstName} ${row.createdBy.lastName}`.trim() } : null }; }
}
