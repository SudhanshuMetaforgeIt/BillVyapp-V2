import { BillItemType } from '../../common/enums/bill-status.enum';
import { RequestValidationPipe } from '../../common/security/request-validation.pipe';
import { CreateBillDto } from './create-bill.dto';
import { MembershipOffersDto } from './membership-offers.dto';

describe('Membership offer request validation', () => {
  const pipe = new RequestValidationPipe();
  const payload = {
    salonId: '11111111-1111-4111-8111-111111111111',
    customerId: '22222222-2222-4222-8222-222222222222',
    discount: 0,
    items: [
      {
        itemType: BillItemType.SERVICE,
        serviceId: '33333333-3333-4333-8333-333333333333',
        quantity: 1,
      },
    ],
  };
  const metadata = { type: 'body' as const, metatype: MembershipOffersDto };

  it('accepts the billing page eligibility request without a creation key', async () => {
    await expect(pipe.transform(payload, metadata)).resolves.toMatchObject(
      payload,
    );
  });

  it('still requires an idempotency key when creating an actual bill', async () => {
    await expect(
      pipe.transform(payload, { ...metadata, metatype: CreateBillDto }),
    ).rejects.toThrow();
    await expect(
      pipe.transform(
        { ...payload, idempotencyKey: 'billing-request-123' },
        {
          ...metadata,
          metatype: CreateBillDto,
        },
      ),
    ).resolves.toMatchObject({ idempotencyKey: 'billing-request-123' });
  });

  it.each([
    { ...payload, salonId: 'invalid' },
    { ...payload, discount: -1 },
    { ...payload, items: [] },
    { ...payload, items: [{ ...payload.items[0], quantity: 0 }] },
    { ...payload, items: [{ ...payload.items[0], unexpected: true }] },
    { ...payload, paymentStatus: 'PAID' },
    { ...payload, enrollmentPlanId: payload.customerId },
  ])('rejects invalid or unrelated fields: %j', async (input) => {
    await expect(pipe.transform(input, metadata)).rejects.toThrow();
  });
});
