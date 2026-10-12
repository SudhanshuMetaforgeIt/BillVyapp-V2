import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { RoleCode } from '../common/enums/role.enum';
import { normalizeUpiId } from '../common/upi';
import {
  centsString,
  moneyCents,
} from '../common/security/financial-integrity';

@Injectable()
export class BillUpiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  async paymentQr(user: AuthenticatedUser, id: string) {
    if (
      ![
        RoleCode.SUPER_ADMIN,
        RoleCode.ADMIN,
        RoleCode.MANAGER,
        RoleCode.STAFF,
      ].includes(user.role)
    )
      throw new ForbiddenException(
        'Only authorized staff may collect payments',
      );
    const bill = await this.prisma.bill.findUnique({
      where: { id },
      select: {
        id: true,
        billNumber: true,
        salonId: true,
        currency: true,
        status: true,
        dueAmount: true,
        salon: { select: { name: true, upiId: true, isActive: true } },
      },
    });
    if (!bill) throw new NotFoundException('Bill not found');
    await this.scope.assertSalonAccess(user, bill.salonId);
    if (bill.currency !== 'INR')
      throw new BadRequestException('UPI payments require an INR bill');
    const cents = moneyCents(bill.dueAmount.toString(), 'amount due');
    if (bill.status !== 'COMPLETED' || cents <= 0 || !bill.salon.isActive)
      throw new BadRequestException(
        'UPI payment requires an active shop and a completed unpaid bill',
      );
    const upiId = normalizeUpiId(bill.salon.upiId);
    if (!upiId)
      throw new BadRequestException(
        'Add this shop’s UPI ID in My Business before collecting UPI payment',
      );
    const amount = centsString(cents);
    const params = new URLSearchParams({
      pa: upiId,
      pn: bill.salon.name.slice(0, 99),
      am: amount,
      cu: 'INR',
      tr: bill.id.replace(/-/g, ''),
      tn: `Bill ${bill.billNumber}`,
    });
    const uri = `upi://pay?${params.toString()}`;
    const qrDataUrl = await QRCode.toDataURL(uri, {
      width: 320,
      margin: 4,
      errorCorrectionLevel: 'M',
    });
    return {
      billId: bill.id,
      billNumber: bill.billNumber,
      shopName: bill.salon.name,
      upiId,
      amount,
      currency: 'INR' as const,
      qrDataUrl,
    };
  }
}
