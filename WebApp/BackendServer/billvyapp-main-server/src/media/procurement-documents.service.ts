import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Readable } from 'node:stream';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CloudinaryDocumentProvider } from './cloudinary-document.provider';
import {
  ATTACHMENT_MAX_BYTES,
  assertAttachmentMetadata,
  validateAttachment,
} from './attachment-validation';

const SELECT = {
  id: true,
  originalFileName: true,
  mimeType: true,
  fileSize: true,
  createdAt: true,
} as const;

@Injectable()
export class ProcurementDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly cloudinary: CloudinaryDocumentProvider,
  ) {}

  private async owner(
    user: AuthenticatedUser,
    type: string,
    id: string,
    requestedSalon?: string,
  ) {
    if (type === 'purchase') {
      const purchase = await this.prisma.purchase.findUnique({
        where: { id },
        select: { salonId: true },
      });
      if (!purchase) throw new NotFoundException('Purchase not found');
      await this.scope.assertSalonAccess(user, purchase.salonId);
      return {
        salonId: purchase.salonId,
        entityType: 'ProcurementBill:purchase',
        entityId: id,
      };
    }
    if (type !== 'vendor')
      throw new BadRequestException('Choose a purchase or vendor');
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    const salonId = user.salonId ?? requestedSalon;
    if (!salonId)
      throw new BadRequestException('Select a salon for vendor bills');
    await this.scope.assertSalonAccess(user, salonId);
    return { salonId, entityType: 'ProcurementBill:vendor', entityId: id };
  }

  async list(
    user: AuthenticatedUser,
    type: string,
    id: string,
    salonId?: string,
  ) {
    const owner = await this.owner(user, type, id, salonId);
    // Vendor records also show proofs from this salon's purchases with the supplier.
    const purchaseIds =
      type === 'vendor'
        ? await this.prisma.purchase.findMany({
            where: { salonId: owner.salonId, vendorId: id },
            select: { id: true },
          })
        : [];
    return this.prisma.mediaFile.findMany({
      where: {
        salonId: owner.salonId,
        storageProvider: 'CLOUDINARY',
        OR: [
          owner,
          ...(purchaseIds.length
            ? [
                {
                  entityType: 'ProcurementBill:purchase',
                  entityId: { in: purchaseIds.map((p) => p.id) },
                },
              ]
            : []),
        ],
      },
      select: SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async upload(
    user: AuthenticatedUser,
    type: string,
    id: string,
    fileName: string,
    mimeType: string,
    body: Readable,
    salonId?: string,
  ) {
    const owner = await this.owner(user, type, id, salonId);
    mimeType = mimeType.split(';')[0].trim().toLowerCase();
    assertAttachmentMetadata(fileName, mimeType, 1);
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of body) {
      const bytes = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk as Uint8Array);
      size += bytes.length;
      if (size > ATTACHMENT_MAX_BYTES)
        throw new BadRequestException('Bills must be 10 MB or smaller');
      chunks.push(bytes);
    }
    assertAttachmentMetadata(fileName, mimeType, size);
    const bytes = await validateAttachment(Buffer.concat(chunks), mimeType);
    const extension = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/avif': 'avif',
    }[mimeType];
    const invoiceName =
      fileName
        .trim()
        .replace(/\.[^.]+$/, '')
        .normalize('NFKD')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 100) || 'invoice';
    const storageKey = `procurement/${owner.salonId}/${invoiceName}-${randomUUID()}.${extension}`;
    await this.cloudinary.upload(storageKey, bytes, mimeType);
    try {
      return await this.prisma.mediaFile.create({
        data: {
          ...owner,
          storageProvider: 'CLOUDINARY',
          storageKey,
          uploadedBy: user.userId,
          originalFileName: fileName.trim(),
          mimeType,
          fileSize: bytes.length,
        },
        select: SELECT,
      });
    } catch (error) {
      await this.cloudinary.remove(storageKey).catch(() => undefined);
      throw error;
    }
  }

  async download(user: AuthenticatedUser, mediaId: string) {
    const media = await this.prisma.mediaFile.findUnique({
      where: { id: mediaId },
    });
    if (
      !media?.entityType?.startsWith('ProcurementBill:') ||
      media.storageProvider !== 'CLOUDINARY' ||
      !media.salonId
    )
      throw new NotFoundException('Purchase bill not found');
    await this.scope.assertSalonAccess(user, media.salonId);
    return { downloadUrl: this.cloudinary.downloadUrl(media.storageKey) };
  }
}
