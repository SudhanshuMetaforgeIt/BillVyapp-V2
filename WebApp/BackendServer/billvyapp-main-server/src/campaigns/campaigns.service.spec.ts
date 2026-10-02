import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { RoleCode } from '../common/enums/role.enum';

describe('CampaignsService', () => {
  const scope = { assertSalonAccess: jest.fn(), salonScope: jest.fn(() => ({})) };
  const prisma = { campaign: { create: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn(), findMany: jest.fn(), count: jest.fn() }, mediaFile: { findUnique: jest.fn() }, $transaction: jest.fn() };
  const audit = { record: jest.fn() };
  const service = new CampaignsService(prisma as never, scope as never, audit as never);

  beforeEach(() => jest.clearAllMocks());

  it('rejects end dates before start dates', async () => {
    await expect(service.create({ userId: 'u', email: '', sessionId: null, role: RoleCode.MANAGER, salonId: 's', franchiseId: 'f' }, { salonId: 's', name: 'Offer', type: 'OFFER', targetAudience: 'ALL_CUSTOMERS', startDate: new Date('2026-10-12'), endDate: new Date('2026-10-10'), deliveryChannels: ['PUSH'] }, {} as never)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('delegates salon isolation to the scoped authorization service', async () => {
    scope.assertSalonAccess.mockRejectedValueOnce(new ForbiddenException());
    await expect(service.create({ userId: 'u', email: '', sessionId: null, role: RoleCode.MANAGER, salonId: 'other', franchiseId: 'f' }, { salonId: 's', name: 'Offer', type: 'OFFER', targetAudience: 'ALL_CUSTOMERS', deliveryChannels: ['PUSH'] }, {} as never)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
