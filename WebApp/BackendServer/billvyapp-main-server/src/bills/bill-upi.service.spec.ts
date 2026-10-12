import QRCode from 'qrcode';
import { BillUpiService } from './bill-upi.service';
import { RoleCode } from '../common/enums/role.enum';
import { RequestValidationPipe } from '../common/security/request-validation.pipe';
import { UpdateSalonDto } from '../salons/dto/update-salon.dto';
import { SalonsService } from '../salons/salons.service';

describe('Manual UPI payment QR', () => {
  it.each([RoleCode.MANAGER, RoleCode.STAFF, RoleCode.CUSTOMER])(
    'denies UPI destination changes by %s at the service layer',
    async (role) => {
      const findFirst = jest.fn();
      const salons = new SalonsService(
        { salon: { findFirst } } as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );
      await expect(
        salons.update(
          { role } as never,
          'shop',
          { upiId: 'attacker@bank' },
          {},
        ),
      ).rejects.toThrow('Only the franchise owner');
      expect(findFirst).not.toHaveBeenCalled();
    },
  );
  const actor = { userId: 'staff', role: RoleCode.STAFF } as never;
  const bill = {
    id: '11111111-1111-4111-8111-111111111111',
    billNumber: 'B-12',
    salonId: 'shop',
    currency: 'INR',
    status: 'COMPLETED',
    dueAmount: '123.45',
    salon: { name: 'Shop & Spa', upiId: 'shop@bank', isActive: true },
  };
  afterEach(() => jest.restoreAllMocks());
  function setup(record = bill) {
    const findUnique = jest.fn().mockResolvedValue(record);
    const assertSalonAccess = jest.fn().mockResolvedValue(undefined);
    const service = new BillUpiService(
      { bill: { findUnique } } as never,
      { assertSalonAccess } as never,
    );
    return { service, findUnique, assertSalonAccess };
  }
  it('encodes the stored payee and exact server balance without creating a payment', async () => {
    const encode = jest
      .spyOn(QRCode, 'toDataURL')
      .mockResolvedValue('data:image/png;base64,qr');
    const { service, assertSalonAccess } = setup();
    const result = await service.paymentQr(actor, bill.id);
    const uri = new URL(encode.mock.calls[0][0] as string);
    expect(uri.protocol).toBe('upi:');
    expect(uri.searchParams.get('pa')).toBe('shop@bank');
    expect(uri.searchParams.get('pn')).toBe('Shop & Spa');
    expect(uri.searchParams.get('am')).toBe('123.45');
    expect(uri.searchParams.get('cu')).toBe('INR');
    expect(result.amount).toBe('123.45');
    expect(assertSalonAccess).toHaveBeenCalledWith(actor, 'shop');
  });
  it('rejects customers before any record lookup', async () => {
    const { service, findUnique } = setup();
    await expect(
      service.paymentQr({ role: RoleCode.CUSTOMER } as never, bill.id),
    ).rejects.toThrow('authorized staff');
    expect(findUnique).not.toHaveBeenCalled();
  });
  it('rejects cross-tenant requests before QR generation', async () => {
    const encode = jest.spyOn(QRCode, 'toDataURL');
    const { service, assertSalonAccess } = setup();
    assertSalonAccess.mockRejectedValue(new Error('Access denied'));
    await expect(service.paymentQr(actor, bill.id)).rejects.toThrow(
      'Access denied',
    );
    expect(encode).not.toHaveBeenCalled();
  });
  it.each([
    { currency: 'USD' },
    { status: 'DRAFT' },
    { status: 'CANCELLED' },
    { dueAmount: '0.00' },
    { salon: { ...bill.salon, upiId: null } },
    { salon: { ...bill.salon, isActive: false } },
  ])('rejects invalid payment state %j', async (change) => {
    const { service } = setup({ ...bill, ...change } as typeof bill);
    await expect(service.paymentQr(actor, bill.id)).rejects.toThrow();
  });
  it('validates and normalizes the shop setting, including explicit removal', async () => {
    const pipe = new RequestValidationPipe();
    const metadata = { type: 'body' as const, metatype: UpdateSalonDto };
    await expect(
      pipe.transform({ upiId: ' shop@bank ' }, metadata),
    ).resolves.toMatchObject({ upiId: 'shop@bank' });
    await expect(
      pipe.transform({ upiId: '' }, metadata),
    ).resolves.toMatchObject({ upiId: null });
    await expect(
      pipe.transform({ upiId: 'shop@bank&am=1' }, metadata),
    ).rejects.toThrow();
    await expect(pipe.transform({ upiId: true }, metadata)).rejects.toThrow();
  });
  it('produces a PNG with node-qrcode', async () => {
    const { service } = setup();
    const result = await service.paymentQr(actor, bill.id);
    expect(
      Buffer.from(result.qrDataUrl.split(',')[1], 'base64')
        .subarray(0, 8)
        .toString('hex'),
    ).toBe('89504e470d0a1a0a');
  });
});
