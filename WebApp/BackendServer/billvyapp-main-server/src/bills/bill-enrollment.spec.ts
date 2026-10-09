import {
  completeChosenEnrollment,
  requireEnrollmentPlan,
  validateEnrollmentDetails,
} from './bill-enrollment';
import type { Prisma } from '../generated/prisma/client';

const base = {
  status: 'COMPLETED',
  paidAmount: '600.00',
  id: 'bill',
  salonId: 'salon',
  customerId: 'customer',
  total: '600.00',
  membershipFee: '100.00',
  enrollmentPlanId: 'plan',
  enrollmentDetails: { nameConfirmed: true, whatsappSameAsBilling: true },
};
function setup() {
  const tx = {
    salon: {
      findUnique: jest.fn().mockResolvedValue({
        franchise: { preferences: { phoneCountry: 'IN' } },
      }),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
    membershipPlan: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'plan',
        name: 'Club',
        price: '100.00',
        durationDays: 90,
        salon: { franchise: { code: 'STARR' } },
      }),
    },
    customer: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: 'customer',
        userId: 'user',
        user: {
          phone: '9876543210',
          email: 'person@example.com',
          isActive: true,
        },
      }),
      update: jest.fn(),
    },
    user: { update: jest.fn() },
    customerAddress: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
    },
    membership: {
      create: jest
        .fn()
        .mockImplementation(({ data }: { data: object }) =>
          Promise.resolve({ id: 'membership', ...data }),
        ),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  return { tx, client: tx as unknown as Prisma.TransactionClient };
}
describe('Customer consent for billing enrollment', () => {
  it('defers activation and profile changes until a completed bill is fully paid', async () => {
    const { tx, client } = setup();
    expect(
      await completeChosenEnrollment(client, { ...base, paidAmount: '599.99' }),
    ).toBeNull();
    expect(
      await completeChosenEnrollment(client, { ...base, status: 'DRAFT' }),
    ).toBeNull();
    expect(tx.membership.create).not.toHaveBeenCalled();
    expect(tx.customer.update).not.toHaveBeenCalled();
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });
  it('rejects an unverified login identifier change before writing customer data', async () => {
    const { tx, client } = setup();
    await expect(
      completeChosenEnrollment(client, {
        ...base,
        enrollmentDetails: {
          ...base.enrollmentDetails,
          email: 'attacker@example.com',
        },
      }),
    ).rejects.toThrow('ownership');
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.customer.update).not.toHaveBeenCalled();
    expect(tx.membership.create).not.toHaveBeenCalled();
  });
  it('does nothing without a selected plan', async () => {
    const { tx, client } = setup();
    expect(
      await completeChosenEnrollment(client, {
        ...base,
        enrollmentPlanId: null,
      }),
    ).toBeNull();
    expect(tx.membershipPlan.findFirst).not.toHaveBeenCalled();
    expect(tx.customer.update).not.toHaveBeenCalled();
  });
  it('qualifies on the bill amount excluding the membership fee', async () => {
    const { tx, client } = setup();
    await completeChosenEnrollment(client, base);
    const args = tx.membershipPlan.findFirst.mock.calls as unknown as {
      where: {
        id: string;
        salonId: string;
        isActive: boolean;
        enrollmentThreshold: { lte: string };
      };
    }[][];
    expect(args[0][0].where).toEqual({
      id: 'plan',
      salonId: 'salon',
      isActive: true,
      enrollmentThreshold: { not: null, lte: '500.00' },
    });
  });
  it('rejects plans outside the eligible active salon scope', async () => {
    const { tx, client } = setup();
    tx.membershipPlan.findFirst.mockResolvedValue(null);
    await expect(
      requireEnrollmentPlan(client, 'plan', 'salon', '500.00'),
    ).rejects.toThrow('no longer qualifies');
  });
  it('requires a confirmed name and a WhatsApp number', () => {
    expect(() =>
      validateEnrollmentDetails({
        nameConfirmed: false,
        whatsappSameAsBilling: true,
      }),
    ).toThrow('Confirm');
    expect(() =>
      validateEnrollmentDetails({
        nameConfirmed: true,
        whatsappSameAsBilling: false,
      }),
    ).toThrow('WhatsApp');
  });
  it.each(['2026-02-30', '2999-01-01'])(
    'rejects invalid DOB %s',
    (dateOfBirth) => {
      expect(() =>
        validateEnrollmentDetails({
          nameConfirmed: true,
          whatsappSameAsBilling: true,
          dateOfBirth,
        }),
      ).toThrow('birth');
    },
  );
  it('saves optional fields to the existing customer/user/address tables', async () => {
    const { tx, client } = setup();
    await completeChosenEnrollment(client, {
      ...base,
      enrollmentDetails: {
        nameConfirmed: true,
        whatsappSameAsBilling: false,
        whatsappNumber: '9123456789',
        dateOfBirth: '2000-01-01',
        email: 'person@example.com',
        address: '10 Main Road',
      },
    });
    expect(firstArg(tx.customer.update)).toEqual({
      where: { id: 'customer' },
      data: {
        whatsappNumber: '+919123456789',
        dateOfBirth: new Date('2000-01-01'),
      },
    });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(firstArg(tx.customerAddress.create)).toEqual({
      data: {
        customerId: 'customer',
        addressLine1: '10 Main Road',
        isDefault: true,
      },
    });
  });
  it('keeps optional stored fields when the customer omits them', async () => {
    const { tx, client } = setup();
    await completeChosenEnrollment(client, base);
    expect(firstArg(tx.customer.update)).toEqual({
      where: { id: 'customer' },
      data: { whatsappNumber: '9876543210' },
    });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.customerAddress.create).not.toHaveBeenCalled();
  });
  it('rejects a changed price before profile writes and coupon issuance', async () => {
    const { tx, client } = setup();
    tx.membershipPlan.findFirst.mockResolvedValue({ price: '200.00' });
    await expect(completeChosenEnrollment(client, base)).rejects.toThrow(
      'price changed',
    );
    expect(tx.customer.update).not.toHaveBeenCalled();
    expect(tx.membership.create).not.toHaveBeenCalled();
  });
});

function firstArg(mock: jest.Mock): unknown {
  return (mock.mock.calls as unknown[][])[0][0];
}
